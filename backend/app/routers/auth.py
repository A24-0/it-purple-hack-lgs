import json
from urllib.parse import parse_qs, unquote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import create_access_token, verify_telegram_init_data
from app.models.leaderboard import LeaderboardEntry
from app.models.user import User
from app.schemas.auth import BotAuthRequest, TelegramAuthRequest, TokenResponse
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


@router.post("/bot", response_model=TokenResponse)
async def bot_auth(
    body: BotAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """Auth endpoint for the Telegram Bot service.

    Validates X-Bot-Secret header against the bot token, then creates or updates
    the user record and returns a JWT — identical flow to WebApp auth but without initData.
    """
    bot_secret = request.headers.get("X-Bot-Secret", "")
    if not settings.TELEGRAM_BOT_TOKEN or bot_secret != settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bot secret")

    result = await db.execute(select(User).where(User.telegram_id == body.telegram_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            telegram_id=body.telegram_id,
            username=body.username,
            first_name=body.first_name,
            last_name=body.last_name,
        )
        db.add(user)
        await db.flush()
        lb = LeaderboardEntry(user_id=user.id)
        db.add(lb)
        await db.commit()
        await db.refresh(user)
    else:
        if body.username is not None:
            user.username = body.username
        if body.first_name is not None:
            user.first_name = body.first_name
        if body.last_name is not None:
            user.last_name = body.last_name
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
