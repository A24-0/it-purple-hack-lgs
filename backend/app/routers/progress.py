from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.game import Game
from app.models.leaderboard import LeaderboardEntry
from app.models.user import User
from app.models.user_progress import UserProgress
from app.schemas.progress import ProgressRewardRequest, UserProgressOut
from app.services.leaderboard_service import add_xp

router = APIRouter(prefix="/api/progress", tags=["progress"])


def _level_from_xp(xp: int) -> int:
    return max(1, min(99, 1 + xp // 200))


@router.get("", response_model=UserProgressOut)
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lb_result = await db.execute(select(LeaderboardEntry).where(LeaderboardEntry.user_id == current_user.id))
    lb = lb_result.scalar_one_or_none()
    total_xp = lb.total_xp if lb else 0
    games_played = lb.games_played if lb else 0
    scenarios_done = lb.scenarios_completed if lb else 0

    done_scenarios = await db.execute(
        select(UserProgress.scenario_id).where(
            UserProgress.user_id == current_user.id,
            UserProgress.status == "completed",
        )
    )
    completed_ids = [str(r[0]) for r in done_scenarios.all()]

    n_games = int(await db.scalar(select(func.count(Game.id)).where(Game.user_id == current_user.id)) or 0)

    sum_scores = int(
        await db.scalar(
            select(func.coalesce(func.sum(Game.score), 0)).where(Game.user_id == current_user.id)
        )
        or 0
    )

    total_answers = scenarios_done + n_games
    if total_answers < 1:
        total_answers = 1
    correct_guess = scenarios_done + (sum_scores if n_games else 0)
    correct_answers = min(total_answers, max(0, correct_guess))

    return UserProgressOut(
        xp=total_xp,
        coins=0,
        today_xp=0,
        level=_level_from_xp(total_xp),
        streak=current_user.streak_days,
        total_answers=total_answers,
        correct_answers=correct_answers,
        completed_scenario_ids=completed_ids,
    )


@router.post("/reward")
async def add_progress_reward(
    body: ProgressRewardRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.xp > 0:
        await add_xp(current_user.id, body.xp, db)
    return {"ok": True}
