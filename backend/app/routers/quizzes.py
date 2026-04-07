from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
from app.services.leaderboard_service import add_xp
from app.services.streak_service import touch_streak

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


@router.get("/daily", response_model=QuizOut)
async def get_daily_quiz(db: AsyncSession = Depends(get_db)):
    today = date.today()
    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.is_daily == True, Quiz.scheduled_date == today)  # noqa: E712
    )
    quiz = result.scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No daily quiz for today")
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

    question_map: dict[int, QuizQuestion] = {q.id: q for q in quiz.questions}
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
