"""Handler for /streak command."""

import logging

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message, User

from bot.api_client import backend

log = logging.getLogger(__name__)
router = Router()


async def show_streak(message: Message, tg_user: User) -> None:
    """Shared logic for streak display (used by /streak and menu callback)."""
    try:
        auth = await backend.bot_auth(
            telegram_id=tg_user.id,
            username=tg_user.username,
            first_name=tg_user.first_name,
            last_name=tg_user.last_name,
        )
        token = auth["access_token"]
        profile = await backend.get_me(token)
    except Exception:
        log.exception("streak fetch failed")
        await message.answer("Не удалось получить данные. Попробуй позже.")
        return

    streak = profile.get("streak_days", 0)
    name = profile.get("first_name") or profile.get("username") or "ты"

    if streak == 0:
        fire = "😴"
        msg = f"{fire} <b>{name}</b>, стрик ещё не начат.\nРеши квиз дня командой /daily_quiz!"
    elif streak < 3:
        fire = "🔥"
        msg = f"{fire} <b>{name}</b>, твой стрик: <b>{streak} день</b>. Так держать!"
    elif streak < 7:
        fire = "🔥🔥"
        msg = f"{fire} <b>{name}</b>, твой стрик: <b>{streak} дня</b>. Горишь!"
    else:
        fire = "🔥🔥🔥"
        msg = f"{fire} <b>{name}</b>, твой стрик: <b>{streak} дней</b>. Легенда!"

    await message.answer(msg, parse_mode="HTML")


@router.message(Command("streak"))
async def cmd_streak(message: Message):
    await show_streak(message, message.from_user)
