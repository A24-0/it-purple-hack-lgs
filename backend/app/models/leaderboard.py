from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    total_xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    scenarios_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (UniqueConstraint("user_id"),)

    user: Mapped["User"] = relationship("User", back_populates="leaderboard_entry")
