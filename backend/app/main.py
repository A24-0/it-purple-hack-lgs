from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.redis import close_redis, init_redis
from app.routers import achievements, ai, auth, dictionary, games, leaderboard, progress, quizzes, scenarios, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
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


@app.get("/health")
async def health():
    return {"status": "ok"}
