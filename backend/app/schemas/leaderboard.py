from pydantic import BaseModel


class LeaderboardEntryOut(BaseModel):
    rank: int
    user_id: int
    username: str | None
    first_name: str | None
    avatar_url: str | None
    total_xp: int
    streak_days: int
    scenarios_completed: int

    model_config = {"from_attributes": True}


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntryOut]
    my_rank: int | None
