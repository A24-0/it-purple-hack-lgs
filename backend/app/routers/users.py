import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth_web import UserMeOut

router = APIRouter(prefix="/api/users", tags=["users"])

APP_ROOT = Path(__file__).resolve().parent.parent.parent
STATIC_ROOT = APP_ROOT / "static"
UPLOAD_ROOT = STATIC_ROOT / "uploads"


class UserProfile(BaseModel):
    id: int
    telegram_id: int | None = None
    username: str | None
    first_name: str | None
    last_name: str | None
    streak_days: int
    role: str

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=128)
    email: str | None = Field(None, max_length=255)


def _to_me_out(user: User) -> UserMeOut:
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


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserMeOut)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        current_user.first_name = body.name.strip()
    if body.email is not None:
        email_norm = str(body.email).strip().lower()
        if not email_norm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пустой email",
            )
        if "@" not in email_norm or "." not in email_norm.split("@")[-1]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некорректный email",
            )
        dup = await db.execute(
            select(User.id).where(User.email == email_norm, User.id != current_user.id)
        )
        if dup.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этот email уже используется",
            )
        current_user.email = email_norm
    if body.name is None and body.email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажи имя или email",
        )
    await db.commit()
    await db.refresh(current_user)
    return _to_me_out(current_user)


_ALLOWED_IMAGE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heic",
}


def _normalize_content_type(raw: str | None) -> str:
    if not raw:
        return ""
    return raw.split(";")[0].strip().lower()


def _guess_type_from_filename(filename: str | None) -> str | None:
    if not filename:
        return None
    lower = filename.lower()
    if lower.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith((".heic", ".heif")):
        return "image/heic"
    return None


def _sniff_image_mime(data: bytes) -> str | None:
    if len(data) < 12:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[4:8] == b"ftyp":
        brand = data[8:16]
        for marker in (b"heic", b"heix", b"hevc", b"mif1", b"msf1"):
            if marker in brand:
                return "image/heic"
    return None


async def _read_image_bytes(file: UploadFile, max_bytes: int) -> tuple[bytes, str]:
    """Читает файл и определяет тип (часто пустой Content-Type или octet-stream с телефона)."""
    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Файл больше {max_bytes // 1_000_000} МБ",
        )
    if len(data) < 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось прочитать изображение",
        )

    ct = _normalize_content_type(file.content_type)
    allowed = set(_ALLOWED_IMAGE.keys())
    resolved: str | None = ct if ct in allowed else None
    if resolved is None:
        resolved = _sniff_image_mime(data) or _guess_type_from_filename(file.filename)
    if resolved not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нужен файл JPEG, PNG, WebP или HEIC. Если с iPhone не грузится — выбери «Совместимый» или сделай скриншот.",
        )
    return data, _ALLOWED_IMAGE[resolved]


@router.post("/me/avatar", response_model=UserMeOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data, ext = await _read_image_bytes(file, 2_500_000)
    uid = current_user.id
    user_dir = UPLOAD_ROOT / str(uid)
    user_dir.mkdir(parents=True, exist_ok=True)
    dest = user_dir / f"avatar{ext}"
    dest.write_bytes(data)

    current_user.avatar_url = f"/static/uploads/{uid}/avatar{ext}"
    await db.commit()
    await db.refresh(current_user)
    return _to_me_out(current_user)


@router.post("/me/photos", response_model=UserMeOut)
async def upload_gallery_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data, ext = await _read_image_bytes(file, 3_500_000)
    uid = current_user.id
    photos = list(current_user.profile_photos or []) if isinstance(current_user.profile_photos, list) else []
    if len(photos) >= 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Не больше 12 фото в альбоме")

    user_dir = UPLOAD_ROOT / str(uid)
    user_dir.mkdir(parents=True, exist_ok=True)
    name = f"photo_{uuid.uuid4().hex}{ext}"
    dest = user_dir / name
    dest.write_bytes(data)

    rel = f"/static/uploads/{uid}/{name}"
    photos.append(rel)
    current_user.profile_photos = photos
    flag_modified(current_user, "profile_photos")
    await db.commit()
    await db.refresh(current_user)
    return _to_me_out(current_user)


@router.delete("/me/photos", response_model=UserMeOut)
async def delete_gallery_photo(
    url: str = Query(..., description="Полный путь из profile_photos, например /static/uploads/1/photo_....jpg"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    photos = list(current_user.profile_photos or []) if isinstance(current_user.profile_photos, list) else []
    if url not in photos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Фото не найдено в альбоме")

    prefix = f"/static/uploads/{current_user.id}/"
    if not url.startswith(prefix):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный адрес")

    fname = url.removeprefix(prefix)
    path = UPLOAD_ROOT / str(current_user.id) / fname
    if path.is_file():
        try:
            path.unlink()
        except OSError:
            pass

    photos = [p for p in photos if p != url]
    current_user.profile_photos = photos
    flag_modified(current_user, "profile_photos")
    await db.commit()
    await db.refresh(current_user)
    return _to_me_out(current_user)
