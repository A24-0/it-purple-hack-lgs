from pydantic import BaseModel


class TelegramAuthRequest(BaseModel):
    init_data: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str | None
    first_name: str | None
