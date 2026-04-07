from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_admin_user, get_current_user
from app.models.scenario import Scenario, ScenarioStep
from app.models.user import User
from app.models.user_progress import UserProgress
from app.schemas.scenario import (
    ScenarioAnswerRequest,
    ScenarioAnswerResponse,
    ScenarioCreate,
    ScenarioOut,
    ScenarioStartRequest,
    ScenarioStartResponse,
    StepCreate,
    StepOut,
)
from app.core.redis import get_redis
from app.services.leaderboard_service import add_xp
from app.services.streak_service import touch_streak

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioOut])
async def list_scenarios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scenario).order_by(Scenario.difficulty))
    return result.scalars().all()


@router.post("/start", response_model=ScenarioStartResponse)
async def start_scenario(
    body: ScenarioStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Scenario)
        .options(selectinload(Scenario.steps))
        .where(Scenario.id == body.scenario_id)
    )
    scenario = result.scalar_one_or_none()
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    if not scenario.steps:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scenario has no steps")

    progress = UserProgress(
        user_id=current_user.id,
        scenario_id=scenario.id,
        current_step=0,
        status="in_progress",
    )
    db.add(progress)
    await db.commit()
    await db.refresh(progress)

    first_step = scenario.steps[0]
    return ScenarioStartResponse(
        progress_id=progress.id,
        scenario_id=scenario.id,
        step=StepOut.model_validate(first_step),
        total_steps=len(scenario.steps),
    )


@router.post("/answer", response_model=ScenarioAnswerResponse)
async def answer_step(
    body: ScenarioAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    result = await db.execute(
        select(UserProgress)
        .where(UserProgress.id == body.progress_id, UserProgress.user_id == current_user.id)
    )
    progress = result.scalar_one_or_none()
    if progress is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Progress not found")
    if progress.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scenario already completed")

    steps_result = await db.execute(
        select(ScenarioStep)
        .where(ScenarioStep.scenario_id == progress.scenario_id)
        .order_by(ScenarioStep.order)
    )
    steps = steps_result.scalars().all()

    current_step = steps[progress.current_step]
    is_correct = False
    feedback = None

    if current_step.choices:
        for choice in current_step.choices:
            if choice.get("text") == body.answer:
                is_correct = choice.get("is_correct", False)
                feedback = choice.get("feedback")
                break
    elif current_step.correct_answer:
        is_correct = body.answer.strip().lower() == current_step.correct_answer.strip().lower()

    xp_earned = 0
    completed = False
    next_step_out = None

    if is_correct:
        progress.current_step += 1
        if progress.current_step >= len(steps):
            # load scenario for xp_reward
            sc_result = await db.execute(select(Scenario).where(Scenario.id == progress.scenario_id))
            scenario = sc_result.scalar_one()
            xp_earned = scenario.xp_reward
            progress.xp_earned = xp_earned
            progress.status = "completed"
            progress.completed_at = datetime.now(timezone.utc)
            completed = True
            await add_xp(current_user.id, xp_earned, db, scenarios_delta=1)
            await touch_streak(current_user.id, db, redis)
        else:
            next_step_out = StepOut.model_validate(steps[progress.current_step])

    await db.commit()

    return ScenarioAnswerResponse(
        correct=is_correct,
        feedback=feedback,
        xp_earned=xp_earned,
        completed=completed,
        next_step=next_step_out,
    )


# ---------- Admin endpoints ----------

@router.post("/admin/scenarios", response_model=ScenarioOut, tags=["admin"])
async def create_scenario(
    body: ScenarioCreate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    scenario = Scenario(**body.model_dump())
    db.add(scenario)
    await db.commit()
    await db.refresh(scenario)
    return scenario


@router.post("/admin/steps", response_model=StepOut, tags=["admin"])
async def create_step(
    body: StepCreate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    step = ScenarioStep(**body.model_dump())
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step
