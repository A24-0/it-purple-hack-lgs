import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.leaderboard import LeaderboardEntry

LEADERBOARD_CACHE_KEY = "leaderboard:top100"


async def add_xp(
    user_id: int,
    xp: int,
    db: AsyncSession,
    scenarios_delta: int = 0,
    games_delta: int = 0,
):
    result = await db.execute(select(LeaderboardEntry).where(LeaderboardEntry.user_id == user_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        entry = LeaderboardEntry(user_id=user_id)
        db.add(entry)

    entry.total_xp += xp
    entry.scenarios_completed += scenarios_delta
    entry.games_played += games_delta
    entry.updated_at = datetime.now(timezone.utc)
    await db.commit()


async def get_leaderboard(db: AsyncSession, redis=None, current_user_id: int | None = None):
    from app.models.user import User
    from app.schemas.leaderboard import LeaderboardEntryOut, LeaderboardResponse

    if redis:
        cached = await redis.get(LEADERBOARD_CACHE_KEY)
        if cached:
            data = json.loads(cached)
            entries = [LeaderboardEntryOut(**e) for e in data]
            my_rank = next((e.rank for e in entries if e.user_id == current_user_id), None)
            return LeaderboardResponse(entries=entries, my_rank=my_rank)

    result = await db.execute(
        select(LeaderboardEntry, User)
        .join(User, User.id == LeaderboardEntry.user_id)
        .order_by(LeaderboardEntry.total_xp.desc())
        .limit(100)
    )
    rows = result.all()

    entries = []
    my_rank = None
    for rank, (lb, user) in enumerate(rows, start=1):
        entry = LeaderboardEntryOut(
            rank=rank,
            user_id=user.id,
            username=user.username,
            first_name=user.first_name,
            avatar_url=user.avatar_url,
            total_xp=lb.total_xp,
            streak_days=user.streak_days,
            scenarios_completed=lb.scenarios_completed,
        )
        entries.append(entry)
        if user.id == current_user_id:
            my_rank = rank

    if redis:
        await redis.setex(
            LEADERBOARD_CACHE_KEY,
            settings.LEADERBOARD_CACHE_TTL,
            json.dumps([e.model_dump() for e in entries]),
        )

    return LeaderboardResponse(entries=entries, my_rank=my_rank)
