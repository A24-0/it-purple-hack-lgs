from fastapi import APIRouter

router = APIRouter(prefix="/api/achievements", tags=["achievements"])


@router.get("")
async def list_achievements():
    """Заглушка: достижения можно вынести в БД позже."""
    return []
