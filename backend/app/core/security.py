import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


def verify_telegram_init_data(init_data: str) -> bool:
    """Verify Telegram WebApp initData hash."""
    if not settings.TELEGRAM_BOT_TOKEN:
        return True  # skip in dev if token not set

    parsed = {}
    hash_value = ""
    for part in init_data.split("&"):
        if "=" in part:
            k, v = part.split("=", 1)
            if k == "hash":
                hash_value = v
            else:
                parsed[k] = v

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", settings.TELEGRAM_BOT_TOKEN.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    # Check auth_date freshness (24h)
    auth_date = int(parsed.get("auth_date", 0))
    if time.time() - auth_date > 86400:
        return False

    return hmac.compare_digest(expected_hash, hash_value)
