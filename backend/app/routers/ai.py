import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.ai import AIChatRequest, AIChatResponse

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    body: AIChatRequest,
    current_user: User = Depends(get_current_user),
):
    # Try ML service first, fallback to OpenAI
    if settings.ML_SERVICE_URL:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.ML_SERVICE_URL}/chat",
                    json=body.model_dump(),
                )
                resp.raise_for_status()
                data = resp.json()
                return AIChatResponse(reply=data["reply"], model=data.get("model"))
        except (httpx.HTTPError, KeyError):
            pass  # fallback to OpenAI

    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service not configured")

    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    if body.context:
        messages.insert(0, {"role": "system", "content": body.context})

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
            json={"model": "gpt-4o-mini", "messages": messages},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="OpenAI error")

        data = resp.json()
        reply = data["choices"][0]["message"]["content"]
        return AIChatResponse(reply=reply, model="gpt-4o-mini")
