from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select, update
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


def _utc_today():
    return datetime.now(timezone.utc).date()


@router.get("", response_model=UserProgressOut)
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = _utc_today()
    if current_user.today_xp_date is not None and current_user.today_xp_date < today:
        current_user.today_xp = 0
        current_user.today_xp_date = None
        await db.commit()
        await db.refresh(current_user)

    lb_result = await db.execute(select(LeaderboardEntry).where(LeaderboardEntry.user_id == current_user.id))
    lb = lb_result.scalar_one_or_none()
    total_xp = lb.total_xp if lb else 0

    done_scenarios = await db.execute(
        select(UserProgress.scenario_id).where(
            UserProgress.user_id == current_user.id,
            UserProgress.status == "completed",
        )
    )
    completed_ids = [str(r[0]) for r in done_scenarios.all()]
    scenarios_completed = len(completed_ids)

    games_rows = (await db.execute(select(Game).where(Game.user_id == current_user.id))).scalars().all()
    n_games = len(games_rows)
    # Игра с ненулевым счётом считаем «успешной попыткой» для грубой метрики точности
    games_ok = sum(1 for g in games_rows if g.score > 0)

    total_answers = scenarios_completed + n_games
    correct_answers = scenarios_completed + games_ok
    if total_answers < 0:
        total_answers = 0
    if correct_answers > total_answers:
        correct_answers = total_answers

    today_xp_out = current_user.today_xp if current_user.today_xp_date == today else 0

    return UserProgressOut(
        xp=total_xp,
        coins=current_user.coins,
        today_xp=today_xp_out,
        level=_level_from_xp(total_xp),
        streak=current_user.streak_days,
        total_answers=total_answers,
        correct_answers=correct_answers,
        completed_scenario_ids=completed_ids,
    )


@router.delete("/reset")
async def reset_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.id
    await db.execute(delete(UserProgress).where(UserProgress.user_id == uid))
    await db.execute(delete(Game).where(Game.user_id == uid))
    await db.execute(delete(LeaderboardEntry).where(LeaderboardEntry.user_id == uid))
    await db.execute(
        update(User)
        .where(User.id == uid)
        .values(
            streak_days=0,
            coins=0,
            today_xp=0,
            today_xp_date=None,
        )
    )
    await db.commit()
    return {"ok": True}


@router.post("/reward")
async def add_progress_reward(
    body: ProgressRewardRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.id
    if body.xp > 0:
        await add_xp(uid, body.xp, db)

    res = await db.execute(select(User).where(User.id == uid))
    user = res.scalar_one()
    today = _utc_today()

    coins_add = body.coins if body.coins and body.coins > 0 else 0
    if coins_add:
        user.coins += coins_add

    if body.xp > 0:
        if user.today_xp_date != today:
            user.today_xp = body.xp
        else:
            user.today_xp += body.xp
        user.today_xp_date = today

    await db.commit()
    return {"ok": True}
