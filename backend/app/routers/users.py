from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth_web import UserMeOut

router = APIRouter(prefix="/api/users", tags=["users"])


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
    name: str = Field(min_length=1, max_length=128)


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserMeOut)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.first_name = body.name.strip()
    await db.commit()
    await db.refresh(current_user)
    name = current_user.first_name or current_user.username or "Игрок"
    return UserMeOut(
        id=str(current_user.id),
        name=name,
        email=current_user.email or "",
        telegram_linked=bool(current_user.telegram_id),
    )
