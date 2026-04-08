from pydantic import BaseModel


class UserProgressOut(BaseModel):
    xp: int
    coins: int
    today_xp: int
    level: int
    streak: int
    total_answers: int
    correct_answers: int
    completed_scenario_ids: list[str]


class ProgressRewardRequest(BaseModel):
    xp: int
    coins: int = 0
