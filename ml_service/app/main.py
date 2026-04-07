import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.chat import router as chat_router
from app.routers.quiz import router as quiz_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="ML Service",
    version="1.0.0",
    description="AI-помощник по страхованию",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(quiz_router)
