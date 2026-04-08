from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.game import Game
from app.models.leaderboard import LeaderboardEntry
from app.models.user import User
from app.schemas.game import GameSaveRequest, GameSaveResponse, GameTopResponse, GameTopEntryOut
from app.services.leaderboard_service import add_xp

router = APIRouter(prefix="/api/games", tags=["games"])

XP_PER_POINT = 1  # 1 xp per score point, cap at 100


@router.post("/save", response_model=GameSaveResponse)
async def save_game(
    body: GameSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    xp_earned = min(body.score * XP_PER_POINT, 100)

    game = Game(
        user_id=current_user.id,
        game_type=body.game_type,
        score=body.score,
        xp_earned=xp_earned,
        game_metadata=body.metadata,
    )
    db.add(game)
    await db.flush()

    await add_xp(current_user.id, xp_earned, db, games_delta=1)

    result = await db.execute(select(LeaderboardEntry).where(LeaderboardEntry.user_id == current_user.id))
    lb = result.scalar_one()

    return GameSaveResponse(game_id=game.id, xp_earned=xp_earned, total_xp=lb.total_xp)


@router.get("/top", response_model=GameTopResponse)
async def top_games(
    game_type: str = Query(..., min_length=1, max_length=64),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    best_sub = (
        select(
            Game.user_id.label("user_id"),
            func.max(Game.score).label("best_score"),
        )
        .where(Game.game_type == game_type)
        .group_by(Game.user_id)
        .subquery()
    )

    q = (
        select(
            best_sub.c.user_id,
            best_sub.c.best_score,
            User.username,
            User.first_name,
        )
        .join(User, User.id == best_sub.c.user_id)
        .order_by(best_sub.c.best_score.desc(), best_sub.c.user_id.asc())
        .limit(limit)
    )
    rows = (await db.execute(q)).all()

    entries = [
        GameTopEntryOut(
            rank=i + 1,
            user_id=row.user_id,
            username=row.username,
            first_name=row.first_name,
            best_score=row.best_score,
        )
        for i, row in enumerate(rows)
    ]
    return GameTopResponse(game_type=game_type, entries=entries)
