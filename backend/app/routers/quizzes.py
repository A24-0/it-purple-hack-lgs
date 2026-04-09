from datetime import date
import json
import logging
import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field, ValidationError

from app.core.database import get_db
from app.core.deps import get_admin_user, get_current_user
from app.core.redis import get_redis
from app.models.quiz import Quiz, QuizQuestion
from app.models.user import User
from app.schemas.quiz import (
    QuizAnswerRequest,
    QuizAnswerResponse,
    QuizAnswerResultItem,
    QuizCreate,
    QuizOut,
)
from app.services.gigachat_service import gigachat_reply
from app.services.leaderboard_service import add_xp
from app.services.streak_service import touch_streak

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])
log = logging.getLogger(__name__)


class GeneratedQuizQuestion(BaseModel):
    text: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)


class GeneratedQuizPayload(BaseModel):
    title: str
    questions: list[GeneratedQuizQuestion] = Field(min_length=5, max_length=5)


def _extract_json_payload(content: str) -> str | None:
    fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", content, re.IGNORECASE)
    if fenced:
        return fenced.group(1)

    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return content[start : end + 1]


def _local_daily_quiz() -> GeneratedQuizPayload:
    return GeneratedQuizPayload(
        title="Блиц-квиз по страхованию",
        questions=[
            GeneratedQuizQuestion(
                text="Что такое франшиза в страховании?",
                options=[
                    "Скидка за безаварийность",
                    "Часть убытка, которую клиент оплачивает сам",
                    "Комиссия банка",
                    "Штраф за просрочку",
                ],
                correct_index=1,
            ),
            GeneratedQuizQuestion(
                text="Что покрывает ОСАГО?",
                options=[
                    "Ущерб вашему авто",
                    "Только угон",
                    "Ущерб третьим лицам по вашей вине",
                    "Любой ремонт без ограничений",
                ],
                correct_index=2,
            ),
            GeneratedQuizQuestion(
                text="Когда нужно сообщить о страховом случае?",
                options=[
                    "Как можно раньше, в сроки договора",
                    "Через месяц",
                    "Только после ремонта",
                    "Только по запросу страховой",
                ],
                correct_index=0,
            ),
            GeneratedQuizQuestion(
                text="Зачем читать исключения в полисе?",
                options=[
                    "Чтобы узнать, что точно не покрывается",
                    "Это неважно",
                    "Только для юристов",
                    "Чтобы увеличить премию",
                ],
                correct_index=0,
            ),
            GeneratedQuizQuestion(
                text="Что увеличивает шанс быстрой выплаты?",
                options=[
                    "Полный пакет документов и фотофиксация",
                    "Удаление переписки",
                    "Ожидание напоминания от страховой",
                    "Устные договоренности без заявлений",
                ],
                correct_index=0,
            ),
        ],
    )


async def _generate_daily_quiz() -> GeneratedQuizPayload:
    messages = [
        {
            "role": "system",
            "content": (
                "Ты создаешь короткие обучающие квизы по страхованию для подростков. "
                "Отвечай только валидным JSON без пояснений."
            ),
        },
        {
            "role": "user",
            "content": (
                "Сгенерируй блиц-квиз на русском языке. "
                "Формат строго JSON: "
                "{\"title\":\"...\",\"questions\":[{\"text\":\"...\",\"options\":[\"...\",\"...\",\"...\",\"...\"],\"correct_index\":0}]} "
                "Требования: ровно 5 вопросов, у каждого ровно 4 варианта ответа, темы: базовая финансовая грамотность и страхование, "
                "без сложных терминов и без повторов."
            ),
        },
    ]

    raw = await gigachat_reply(messages)
    if not raw:
        return _local_daily_quiz()

    payload_text = _extract_json_payload(raw)
    if not payload_text:
        log.warning("GigaChat quiz response has no JSON payload")
        return _local_daily_quiz()

    try:
        parsed = json.loads(payload_text)
        return GeneratedQuizPayload.model_validate(parsed)
    except (json.JSONDecodeError, ValidationError) as exc:
        log.warning("Failed to parse GigaChat daily quiz payload: %s", exc)
        return _local_daily_quiz()


async def _find_today_daily_quiz(db: AsyncSession, today: date) -> Quiz | None:
    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.is_daily == True, Quiz.scheduled_date == today)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def _create_daily_quiz_for_today(db: AsyncSession, today: date) -> Quiz:
    generated = await _generate_daily_quiz()
    quiz = Quiz(
        title=generated.title,
        scheduled_date=today,
        is_daily=True,
        xp_reward=25,
    )
    db.add(quiz)
    await db.flush()

    for idx, q in enumerate(generated.questions):
        db.add(
            QuizQuestion(
                quiz_id=quiz.id,
                order=idx,
                text=q.text,
                options=q.options,
                correct_index=q.correct_index,
            )
        )

    await db.commit()
    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz.id)
    )
    return result.scalar_one()


@router.get("/daily", response_model=QuizOut)
async def get_daily_quiz(db: AsyncSession = Depends(get_db)):
    today = date.today()
    quiz = await _find_today_daily_quiz(db, today)
    if quiz is None:
        quiz = await _create_daily_quiz_for_today(db, today)
    return quiz


@router.post("/answer", response_model=QuizAnswerResponse)
async def answer_quiz(
    body: QuizAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == body.quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    answer_map: dict[int, int] = {a.question_id: a.selected_index for a in body.answers}

    results: list[QuizAnswerResultItem] = []
    correct_count = 0

    for question in quiz.questions:
        selected = answer_map.get(question.id)
        is_correct = selected is not None and selected == question.correct_index
        if is_correct:
            correct_count += 1
        results.append(
            QuizAnswerResultItem(
                question_id=question.id,
                correct=is_correct,
                correct_index=question.correct_index,
            )
        )

    total = len(quiz.questions)
    xp_earned = round(quiz.xp_reward * correct_count / total) if total > 0 else 0

    if xp_earned > 0:
        await add_xp(current_user.id, xp_earned, db)
        await touch_streak(current_user.id, db, redis)

    return QuizAnswerResponse(
        quiz_id=quiz.id,
        correct_count=correct_count,
        total_questions=total,
        xp_earned=xp_earned,
        results=results,
    )


# ---------- Admin ----------

@router.post("/admin/quizzes", response_model=QuizOut, tags=["admin"])
async def create_quiz(
    body: QuizCreate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    quiz = Quiz(
        title=body.title,
        scheduled_date=body.scheduled_date,
        is_daily=body.is_daily,
        xp_reward=body.xp_reward,
    )
    db.add(quiz)
    await db.flush()

    for q in body.questions:
        question = QuizQuestion(quiz_id=quiz.id, **q.model_dump())
        db.add(question)

    await db.commit()
    await db.refresh(quiz)

    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz.id)
    )
    return result.scalar_one()
