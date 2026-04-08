import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User
from pydantic import BaseModel, Field

from app.schemas.ai import AIChatRequest, AIChatResponse

router = APIRouter(prefix="/api/ai", tags=["ai"])


class HintBody(BaseModel):
    scenario_id: str = Field(alias="scenarioId")
    step_id: str = Field(alias="stepId")

    model_config = {"populate_by_name": True}


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

    def _fallback_reply() -> AIChatResponse:
        return AIChatResponse(
            reply=(
                "Давай просто: франшиза — это часть суммы, которую ты платишь сам при страховом случае. "
                "Остальное покрывает страховая по договору. Хочешь, объясню на примере с телефоном или велосипедом?"
            ),
            model="local-fallback",
        )

    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("your-"):
        return _fallback_reply()

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
            return _fallback_reply()

        data = resp.json()
        try:
            reply = data["choices"][0]["message"]["content"]
            return AIChatResponse(reply=reply, model="gpt-4o-mini")
        except Exception:
            return _fallback_reply()


@router.post("/hint")
async def ai_hint(
    body: HintBody,
    _user: User = Depends(get_current_user),
):
    return {
        "hint": "Сравни варианты: что сильнее защищает от неожиданных расходов? Часто верный ответ связан с полисом или обращением к страховой.",
    }


@router.get("/suggestions")
async def ai_suggestions(_user: User = Depends(get_current_user)):
    return [
        "Что такое франшиза?",
        "Как работает КАСКО?",
        "Что такое страховой случай?",
        "Зачем нужно ОСАГО?",
    ]
