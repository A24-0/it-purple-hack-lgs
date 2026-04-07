from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_type: Mapped[str] = mapped_column(String(64), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="games")
