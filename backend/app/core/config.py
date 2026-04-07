from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/purplehack"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    TELEGRAM_BOT_TOKEN: str = ""
    OPENAI_API_KEY: str = ""
    ML_SERVICE_URL: str = "http://localhost:8001"

    LEADERBOARD_CACHE_TTL: int = 60  # seconds

    class Config:
        env_file = ".env"


settings = Settings()
