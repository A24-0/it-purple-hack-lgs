from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.redis import close_redis, init_redis
from app.routers import achievements, ai, auth, dictionary, games, leaderboard, progress, quizzes, scenarios, users
from app.services.seed_scenarios import ensure_demo_scenario


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    try:
        await ensure_demo_scenario()
    except Exception:
        pass
    yield
    await close_redis()


app = FastAPI(
    title="PurpleHack API",
    version="1.0.0",
    lifespan=lifespan,
)

# allow_credentials=True несовместим с allow_origins=["*"] — браузер может рвать запрос (Failed to fetch)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(progress.router)
app.include_router(dictionary.router)
app.include_router(achievements.router)
app.include_router(scenarios.router)
app.include_router(quizzes.router)
app.include_router(leaderboard.router)
app.include_router(games.router)
app.include_router(ai.router)

_static_dir = Path(__file__).resolve().parent.parent / "static"
_static_dir.mkdir(parents=True, exist_ok=True)
(_static_dir / "uploads").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    """Проверка связи с PostgreSQL (удобно для диагностики «не могу войти»)."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "database": "unreachable",
                "detail": str(e),
            },
        )
