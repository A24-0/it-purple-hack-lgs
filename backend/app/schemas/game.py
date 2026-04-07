from pydantic import BaseModel


class GameSaveRequest(BaseModel):
    game_type: str
    score: int
    metadata: dict | None = None


class GameSaveResponse(BaseModel):
    game_id: int
    xp_earned: int
    total_xp: int
