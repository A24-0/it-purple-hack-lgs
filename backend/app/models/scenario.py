from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1-3
    xp_reward: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    steps: Mapped[list["ScenarioStep"]] = relationship(
        "ScenarioStep", back_populates="scenario", order_by="ScenarioStep.order", lazy="select"
    )
    progress: Mapped[list["UserProgress"]] = relationship("UserProgress", back_populates="scenario", lazy="select")


class ScenarioStep(Base):
    __tablename__ = "scenario_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scenario_id: Mapped[int] = mapped_column(Integer, ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    choices: Mapped[list | None] = mapped_column(JSON, nullable=True)  # [{text, is_correct, feedback}]
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)

    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="steps")
