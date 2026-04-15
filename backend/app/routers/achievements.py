from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.game import Game
from app.models.leaderboard import LeaderboardEntry
from app.models.user import User
from app.models.user_progress import UserProgress
from app.schemas.achievement import AchievementOut
from app.services.achievement_service import build_achievement_payload

router = APIRouter(prefix="/api/achievements", tags=["achievements"])


@router.get("", response_model=list[AchievementOut])
async def list_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lb_result = await db.execute(select(LeaderboardEntry).where(LeaderboardEntry.user_id == current_user.id))
    lb = lb_result.scalar_one_or_none()
    total_xp = lb.total_xp if lb else 0
    scenarios_done = lb.scenarios_completed if lb else 0
    games_played = lb.games_played if lb else 0

    n_games = int(await db.scalar(select(func.count(Game.id)).where(Game.user_id == current_user.id)) or 0)
    if games_played < n_games:
        games_played = n_games

    scenarios_count = int(
        await db.scalar(
            select(func.count(UserProgress.id)).where(
                UserProgress.user_id == current_user.id,
                UserProgress.status == "completed",
            )
        )
        or 0
    )
    if scenarios_count > scenarios_done:
        scenarios_done = scenarios_count

    stats = {
        "xp": total_xp,
        "scenarios_done": scenarios_done,
        "games_played": games_played,
        "streak": current_user.streak_days,
        "coins": current_user.coins,
    }
    return build_achievement_payload(stats)
