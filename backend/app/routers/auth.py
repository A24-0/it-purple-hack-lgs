import json
import secrets
import string
from urllib.parse import parse_qs, unquote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.passwords import hash_password, verify_password
from app.core.redis import get_redis
from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_telegram_init_data
from app.models.leaderboard import LeaderboardEntry
from app.models.user import User
from app.schemas.auth import BotAuthRequest, TelegramAuthRequest, TelegramLinkRequest, TokenResponse
from app.schemas.auth_web import UserMeOut, WebAuthResponse, WebLoginRequest, WebRegisterRequest
from app.services.streak_service import touch_streak


class LinkCodeResponse(BaseModel):
    code: str
    expires_in: int  # seconds


class BotLinkCodeRequest(BaseModel):
    code: str
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None

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


def _user_me(user: User) -> UserMeOut:
    name = user.first_name or user.username or "Игрок"
    photos = user.profile_photos if isinstance(user.profile_photos, list) else None
    return UserMeOut(
        id=str(user.id),
        name=name,
        email=user.email or "",
        telegram_linked=bool(user.telegram_id),
        avatar_url=user.avatar_url,
        profile_photos=photos,
    )


@router.get("/me", response_model=UserMeOut)
async def auth_me(current_user: User = Depends(get_current_user)):
    return _user_me(current_user)


@router.post("/register", response_model=WebAuthResponse)
async def web_register(body: WebRegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email.strip().lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        telegram_id=None,
        email=body.email.strip().lower(),
        password_hash=hash_password(body.password),
        first_name=body.name,
        username=None,
    )
    db.add(user)
    try:
        await db.flush()
        lb = LeaderboardEntry(user_id=user.id)
        db.add(lb)
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")

    token = create_access_token(user.id)
    return WebAuthResponse(access_token=token, user=_user_me(user))


@router.post("/login", response_model=WebAuthResponse)
async def web_login(body: WebLoginRequest, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user.id)
    return WebAuthResponse(access_token=token, user=_user_me(user))


@router.post("/link-telegram", response_model=UserMeOut)
async def link_telegram(
    body: TelegramLinkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_telegram_init_data(body.init_data):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram initData")

    tg_user = _parse_tg_user(body.init_data)
    telegram_id = int(tg_user.get("id", 0))
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot parse Telegram user")

    existing = await db.execute(select(User).where(User.telegram_id == telegram_id))
    existing_user = existing.scalar_one_or_none()
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот Telegram уже привязан к другому аккаунту",
        )

    current_user.telegram_id = telegram_id
    current_user.username = tg_user.get("username", current_user.username)
    current_user.first_name = tg_user.get("first_name", current_user.first_name)
    current_user.last_name = tg_user.get("last_name", current_user.last_name)
    await db.commit()
    await db.refresh(current_user)
    return _user_me(current_user)


@router.post("/link-code/generate", response_model=LinkCodeResponse)
async def generate_link_code(
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    """Generates a 6-digit code for linking Telegram via bot command /link XXXXXX"""
    code = "".join(secrets.choice(string.digits) for _ in range(6))
    await redis.setex(f"tg_link:{code}", 600, str(current_user.id))
    return LinkCodeResponse(code=code, expires_in=600)


@router.post("/link-code/confirm")
async def confirm_link_code(
    body: BotLinkCodeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """Called by the Telegram bot to confirm account linking by code."""
    bot_secret = request.headers.get("X-Bot-Secret", "")
    if not settings.TELEGRAM_BOT_TOKEN or bot_secret != settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bot secret")

    key = f"tg_link:{body.code}"
    user_id_raw = await redis.get(key)
    if not user_id_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Код не найден или истёк")

    await redis.delete(key)

    result = await db.execute(select(User).where(User.id == int(user_id_raw)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    existing = await db.execute(select(User).where(User.telegram_id == body.telegram_id))
    existing_user = existing.scalar_one_or_none()
    if existing_user and existing_user.id != user.id:
        # If the existing account is a bot-only account (no email), detach the telegram_id
        # so the web user (who has email) can claim it.
        if existing_user.email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Этот Telegram уже привязан к другому аккаунту",
            )
        existing_user.telegram_id = None

    user.telegram_id = body.telegram_id
    if body.username is not None:
        user.username = body.username
    if body.first_name is not None:
        user.first_name = body.first_name
    if body.last_name is not None:
        user.last_name = body.last_name
    await db.commit()
    return {"ok": True, "user_id": str(user.id)}
