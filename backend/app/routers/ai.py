import uuid
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


async def _gigachat_reply(messages: list[dict]) -> str | None:
    """Получить ответ от GigaChat. Возвращает None при любой ошибке."""
    creds = settings.GIGACHAT_CREDENTIALS
    if not creds:
        return None
    try:
        # Шаг 1: получить access_token
        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            token_resp = await client.post(
                "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
                headers={
                    "Authorization": f"Basic {creds}",
                    "RqUID": str(uuid.uuid4()),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"scope": "GIGACHAT_API_PERS"},
            )
            token_resp.raise_for_status()
            access_token = token_resp.json()["access_token"]

        # Шаг 2: отправить сообщение
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            chat_resp = await client.post(
                "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "GigaChat",
                    "messages": messages,
                },
            )
            chat_resp.raise_for_status()
            return chat_resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return None


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    body: AIChatRequest,
    current_user: User = Depends(get_current_user),
):
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    if body.context:
        messages.insert(0, {"role": "system", "content": body.context})

    # 1. ML-сервис
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
            pass

    # 2. GigaChat
    reply = await _gigachat_reply(messages)
    if reply:
        return AIChatResponse(reply=reply, model="GigaChat")

    # 3. OpenAI
    if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("your-"):
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={"model": "gpt-4o-mini", "messages": messages},
            )
            if resp.status_code == 200:
                try:
                    return AIChatResponse(
                        reply=resp.json()["choices"][0]["message"]["content"],
                        model="gpt-4o-mini",
                    )
                except Exception:
                    pass

    # 4. Хардкод
    return AIChatResponse(
        reply=(
            "Давай просто: франшиза — это часть суммы, которую ты платишь сам при страховом случае. "
            "Остальное покрывает страховая по договору. Хочешь, объясню на примере с телефоном или велосипедом?"
        ),
        model="local-fallback",
    )


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
