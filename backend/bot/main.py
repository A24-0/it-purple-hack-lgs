"""Telegram Bot entry point.

Run with:
    python -m bot.main
"""

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand

from bot.config import bot_settings
from bot.handlers import app_handler, link, quiz, start, streak

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

BOT_COMMANDS = [
    BotCommand(command="start", description="Главное меню"),
    BotCommand(command="help", description="Справка"),
    BotCommand(command="daily_quiz", description="Квиз дня"),
    BotCommand(command="streak", description="Мой стрик"),
    BotCommand(command="app", description="Открыть приложение"),
    BotCommand(command="link", description="Привязать аккаунт по коду"),
]


async def main() -> None:
    if not bot_settings.TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")

    bot = Bot(
        token=bot_settings.TELEGRAM_BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())

    # Register routers (order matters for priority)
    dp.include_router(start.router)
    dp.include_router(link.router)
    dp.include_router(quiz.router)
    dp.include_router(streak.router)
    dp.include_router(app_handler.router)

    await bot.set_my_commands(BOT_COMMANDS)
    log.info("Bot started, polling…")

    try:
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
