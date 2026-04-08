from pydantic import BaseModel


class ScenarioStartRequest(BaseModel):
    scenario_id: int


class ScenarioAnswerRequest(BaseModel):
    progress_id: int
    answer: str


class StepOut(BaseModel):
    id: int
    order: int
    prompt: str
    choices: list | None

    model_config = {"from_attributes": True}


class ScenarioStartResponse(BaseModel):
    progress_id: int
    scenario_id: int
    step: StepOut
    total_steps: int


class ScenarioAnswerResponse(BaseModel):
    correct: bool
    feedback: str | None
    xp_earned: int
    completed: bool
    next_step: StepOut | None


class ScenarioOut(BaseModel):
    id: int
    title: str
    description: str | None
    category: str | None
    difficulty: int
    xp_reward: int
    icon: str = "📋"

    model_config = {"from_attributes": True}


# Admin schemas
class ScenarioCreate(BaseModel):
    title: str
    description: str | None = None
    category: str | None = None
    difficulty: int = 1
    xp_reward: int = 50


class StepCreate(BaseModel):
    scenario_id: int
    order: int
    prompt: str
    choices: list | None = None
    correct_answer: str | None = None
