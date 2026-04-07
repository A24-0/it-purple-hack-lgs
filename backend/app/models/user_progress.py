from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserProgress(Base):
    __tablename__ = "user_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scenario_id: Mapped[int] = mapped_column(Integer, ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    current_step: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="in_progress", nullable=False)  # in_progress, completed
    xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="progress")
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="progress")
