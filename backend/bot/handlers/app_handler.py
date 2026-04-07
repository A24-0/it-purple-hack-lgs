"""Handler for /app command — opens the Telegram WebApp."""

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from bot.config import bot_settings

router = Router()


def _webapp_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🚀 Открыть приложение",
                    web_app=WebAppInfo(url=bot_settings.WEBAPP_URL),
                )
            ]
        ]
    )


@router.message(Command("app"))
async def cmd_app(message: Message):
    await message.answer(
        "Нажми кнопку ниже, чтобы открыть полное приложение прямо в Telegram:",
        reply_markup=_webapp_keyboard(),
    )
