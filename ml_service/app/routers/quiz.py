from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.services.quiz_generator import generate_quiz, get_daily_quiz

router = APIRouter(prefix="/quiz")


class QuizResponse(BaseModel):
    question: str
    choices: list[dict]
    explanation: str
    category: str
    date: str | None = None


@router.get("/daily", response_model=QuizResponse)
async def daily_quiz() -> QuizResponse:
    """Returns today's quiz. Topic rotates automatically each day."""
    try:
        quiz = await get_daily_quiz()
        return QuizResponse(**quiz)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Не удалось сгенерировать квиз: {exc}",
        )


@router.get("/generate", response_model=QuizResponse)
async def generate(topic: str = Query(..., description="Тема квиза, например: ОСАГО")) -> QuizResponse:
    """Generates a quiz for a given topic. Used for testing and admin."""
    try:
        quiz = await generate_quiz(topic)
        return QuizResponse(**quiz)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Не удалось сгенерировать квиз: {exc}",
        )
