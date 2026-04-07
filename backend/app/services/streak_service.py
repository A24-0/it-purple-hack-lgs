"""Streak tracking via Redis.

Redis key: streak:{user_id}:last_date  →  ISO date string (YYYY-MM-DD)

Logic on each call to touch_streak():
  - no key  →  streak = 1
  - last_date == today  →  no change (already counted)
  - last_date == yesterday  →  streak += 1
  - last_date < yesterday  →  streak = 1 (broken)
Updates user.streak_days and user.last_activity_date in DB.
"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

_KEY = "streak:{}:last_date"


async def touch_streak(user_id: int, db: AsyncSession, redis=None) -> int:
    """Update streak for user and return current streak_days value."""
    today = date.today()

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return 0

    if redis:
        key = _KEY.format(user_id)
        last_str: str | None = await redis.get(key)

        if last_str is None:
            new_streak = 1
        else:
            last = date.fromisoformat(last_str)
            if last == today:
                return user.streak_days  # already updated today
            elif last == today - timedelta(days=1):
                new_streak = user.streak_days + 1
            else:
                new_streak = 1

        await redis.set(key, today.isoformat())
    else:
        # Fallback: use DB field
        last = user.last_activity_date
        if last is not None:
            last_date = last.date() if hasattr(last, "date") else last
            if last_date == today:
                return user.streak_days
            elif last_date == today - timedelta(days=1):
                new_streak = user.streak_days + 1
            else:
                new_streak = 1
        else:
            new_streak = 1

    user.streak_days = new_streak
    user.last_activity_date = datetime.now(timezone.utc)
    await db.commit()
    return new_streak
