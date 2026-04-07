import json
from urllib.parse import parse_qs, unquote

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import create_access_token, verify_telegram_init_data
from app.models.leaderboard import LeaderboardEntry
from app.models.user import User
from app.schemas.auth import TelegramAuthRequest, TokenResponse
from app.services.streak_service import touch_streak

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _parse_tg_user(init_data: str) -> dict:
    parsed = parse_qs(unquote(init_data))
    user_raw = parsed.get("user", ["{}"])[0]
    return json.loads(user_raw)


@router.post("/telegram", response_model=TokenResponse)
async def telegram_auth(
    body: TelegramAuthRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    if not verify_telegram_init_data(body.init_data):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram initData")

    tg_user = _parse_tg_user(body.init_data)
    telegram_id = int(tg_user.get("id", 0))
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot parse Telegram user")

    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            telegram_id=telegram_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name"),
            last_name=tg_user.get("last_name"),
        )
        db.add(user)
        await db.flush()

        lb = LeaderboardEntry(user_id=user.id)
        db.add(lb)
        await db.commit()
        await db.refresh(user)
    else:
        # update profile fields if changed
        user.username = tg_user.get("username", user.username)
        user.first_name = tg_user.get("first_name", user.first_name)
        user.last_name = tg_user.get("last_name", user.last_name)
        await db.commit()
        await db.refresh(user)

    await touch_streak(user.id, db, redis)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        first_name=user.first_name,
    )
