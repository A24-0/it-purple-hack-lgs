from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GIGACHAT_AUTH_KEY: str = ""

    HOST: str = "0.0.0.0"
    PORT: int = 8001
    LOG_LEVEL: str = "info"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
