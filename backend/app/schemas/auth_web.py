from pydantic import BaseModel, Field


class UserMeOut(BaseModel):
    id: str
    name: str
    email: str
    telegram_linked: bool = False
    avatar_url: str | None = None
    profile_photos: list[str] | None = None


class WebRegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class WebLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str


class WebAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserMeOut
