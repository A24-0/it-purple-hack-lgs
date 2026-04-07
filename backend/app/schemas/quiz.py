from datetime import date

from pydantic import BaseModel, Field


class QuizQuestionOut(BaseModel):
    id: int
    order: int
    text: str
    options: list[str]

    model_config = {"from_attributes": True}


class QuizOut(BaseModel):
    id: int
    title: str
    xp_reward: int
    questions: list[QuizQuestionOut]

    model_config = {"from_attributes": True}


# Answer submission
class QuizAnswerItem(BaseModel):
    question_id: int
    selected_index: int


class QuizAnswerRequest(BaseModel):
    quiz_id: int
    answers: list[QuizAnswerItem] = Field(..., min_length=1)


class QuizAnswerResultItem(BaseModel):
    question_id: int
    correct: bool
    correct_index: int


class QuizAnswerResponse(BaseModel):
    quiz_id: int
    correct_count: int
    total_questions: int
    xp_earned: int
    results: list[QuizAnswerResultItem]


# Admin
class QuizQuestionCreate(BaseModel):
    order: int
    text: str
    options: list[str]
    correct_index: int


class QuizCreate(BaseModel):
    title: str
    scheduled_date: date | None = None
    is_daily: bool = False
    xp_reward: int = 20
    questions: list[QuizQuestionCreate] = []
