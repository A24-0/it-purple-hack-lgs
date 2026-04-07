from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class AIChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: str | None = None  # e.g. current scenario context


class AIChatResponse(BaseModel):
    reply: str
    model: str | None = None
