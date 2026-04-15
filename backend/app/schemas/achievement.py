from pydantic import BaseModel


class AchievementOut(BaseModel):
    id: str
    icon: str
    title: str
    description: str
    completed: bool
