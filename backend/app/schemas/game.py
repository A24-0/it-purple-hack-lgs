from pydantic import BaseModel


class GameSaveRequest(BaseModel):
    game_type: str
    score: int
    metadata: dict | None = None


class GameSaveResponse(BaseModel):
    game_id: int
    xp_earned: int
    total_xp: int


class GameTopEntryOut(BaseModel):
    rank: int
    user_id: int
    username: str | None
    first_name: str | None
    best_score: int


class GameTopResponse(BaseModel):
    game_type: str
    entries: list[GameTopEntryOut]
