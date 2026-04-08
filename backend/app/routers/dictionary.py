from fastapi import APIRouter

from app.data.dictionary_terms import TERMS

router = APIRouter(prefix="/api/dictionary", tags=["dictionary"])


@router.get("/terms")
async def list_terms():
    return TERMS
