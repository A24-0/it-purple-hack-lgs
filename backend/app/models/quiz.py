from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    scheduled_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)  # None = not daily
    is_daily: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    questions: Mapped[list["QuizQuestion"]] = relationship(
        "QuizQuestion", back_populates="quiz", order_by="QuizQuestion.order", lazy="select"
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quiz_id: Mapped[int] = mapped_column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSON, nullable=False)  # [str]
    correct_index: Mapped[int] = mapped_column(Integer, nullable=False)

    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="questions")
