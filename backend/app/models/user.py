from datetime import date, datetime, timezone

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    coins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    today_xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    today_xp_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    profile_photos: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    role: Mapped[str] = mapped_column(String(16), default="user", nullable=False)
    streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_activity_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    progress: Mapped[list["UserProgress"]] = relationship("UserProgress", back_populates="user", lazy="select")
    games: Mapped[list["Game"]] = relationship("Game", back_populates="user", lazy="select")
    leaderboard_entry: Mapped["LeaderboardEntry | None"] = relationship(
        "LeaderboardEntry", back_populates="user", uselist=False, lazy="select"
    )
