from pydantic_settings import BaseSettings


class BotSettings(BaseSettings):
    TELEGRAM_BOT_TOKEN: str = ""
    BACKEND_URL: str = "http://api:8000"
    # URL фронтенда для кнопки /app (Telegram WebApp)
    WEBAPP_URL: str = "https://example.com"

    class Config:
        env_file = ".env"


bot_settings = BotSettings()
