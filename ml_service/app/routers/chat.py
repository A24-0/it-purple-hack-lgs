import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.glossary import find_term, list_all_terms
from app.services.hints import get_hint
from app.services.llm_client import SYSTEM_PROMPT, ask_llm
from app.services.personalization import get_full_stats, get_recommendation, record_mistake

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: str | None = None
    scenario_id: int | None = None
    step: int | None = None
    mode: str = "chat"
    user_id: int | None = None


class ChatResponse(BaseModel):
    reply: str
    model: str | None = None


class MistakeRequest(BaseModel):
    user_id: int
    scenario_id: int
    step: int
    question: str = ""


class RecommendRequest(BaseModel):
    user_id: int


class RecommendResponse(BaseModel):
    recommendation: str
    stats: dict


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    user_messages = [m for m in body.messages if m.role == "user"]
    last_question = user_messages[-1].content if user_messages else ""

    if body.mode == "hint" and body.scenario_id is not None:
        try:
            hint_text, source = await get_hint(
                scenario_id=body.scenario_id,
                step=body.step or 0,
                question=last_question,
            )
            return ChatResponse(reply=hint_text, model=f"hint:{source}")
        except Exception as exc:
            logger.error("Hint generation failed: %s", exc)
            return ChatResponse(
                reply="Подумай внимательно над условием задачи. Какое ключевое понятие здесь используется?",
                model="hint:fallback",
            )

    glossary_answer = find_term(last_question)
    if glossary_answer:
        return ChatResponse(reply=glossary_answer, model="glossary")

    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    system = SYSTEM_PROMPT
    if body.context:
        system = f"{SYSTEM_PROMPT}\n\nДополнительный контекст: {body.context}"

    try:
        reply, model_name = await ask_llm(messages, system=system)
        return ChatResponse(reply=reply, model=model_name)
    except (ValueError, RuntimeError) as exc:
        logger.error("LLM call failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.error("Unexpected LLM error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Ошибка при обращении к AI-сервису. Попробуй ещё раз.",
        )


@router.post("/mistake", status_code=status.HTTP_204_NO_CONTENT)
async def record_user_mistake(body: MistakeRequest) -> None:
    record_mistake(
        user_id=body.user_id,
        scenario_id=body.scenario_id,
        step=body.step,
        question=body.question,
    )


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(body: RecommendRequest) -> RecommendResponse:
    stats = get_full_stats(body.user_id)
    return RecommendResponse(recommendation=get_recommendation(body.user_id), stats=stats)


@router.get("/terms")
async def get_terms() -> dict:
    terms = list_all_terms()
    return {"terms": terms, "count": len(terms)}


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ml-service"}
