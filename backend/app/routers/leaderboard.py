from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import decode_access_token
from app.schemas.leaderboard import LeaderboardResponse
from app.services.leaderboard_service import get_leaderboard

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])
bearer_scheme = HTTPBearer(auto_error=False)


@router.get("", response_model=LeaderboardResponse)
async def leaderboard(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    current_user_id = None
    if credentials:
        current_user_id = decode_access_token(credentials.credentials)

    return await get_leaderboard(db, redis=redis, current_user_id=current_user_id)
