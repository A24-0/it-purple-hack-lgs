from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.game import Game
from app.models.leaderboard import LeaderboardEntry
from app.models.user import User
from app.schemas.game import GameSaveRequest, GameSaveResponse
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
        metadata=body.metadata,
    )
    db.add(game)
    await db.flush()

    await add_xp(current_user.id, xp_earned, db, games_delta=1)

    result = await db.execute(select(LeaderboardEntry).where(LeaderboardEntry.user_id == current_user.id))
    lb = result.scalar_one()

    return GameSaveResponse(game_id=game.id, xp_earned=xp_earned, total_xp=lb.total_xp)
