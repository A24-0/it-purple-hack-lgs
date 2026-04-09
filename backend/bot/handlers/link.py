"""Handler for /link <code> command — links a web account to Telegram."""

import logging

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from bot.api_client import backend

log = logging.getLogger(__name__)
router = Router()


@router.message(Command("link"))
async def cmd_link(message: Message):
    user = message.from_user
    args = (message.text or "").split(maxsplit=1)

    if len(args) < 2 or not args[1].strip():
        await message.answer(
            "Укажи код привязки:\n"
            "<code>/link 123456</code>\n\n"
            "Код можно получить в приложении: Настройки → Telegram → «Привязать через код».",
            parse_mode="HTML",
        )
        return

    code = args[1].strip()
    if not code.isdigit() or len(code) != 6:
        await message.answer(
            "Код должен состоять из 6 цифр. Проверь и попробуй снова.",
        )
        return

    try:
        await backend.confirm_link_code(
            code=code,
            telegram_id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
        )
        await message.answer(
            "✅ Telegram успешно привязан к твоему аккаунту!\n\n"
            "Теперь ты можешь входить через Telegram в мини-приложении.",
        )
    except Exception as e:
        err = str(e)
        if "404" in err or "не найден" in err.lower() or "not found" in err.lower():
            await message.answer(
                "Код не найден или истёк. Получи новый код в приложении:\n"
                "Настройки → Telegram → «Привязать через код».",
            )
        elif "409" in err or "уже привязан" in err.lower():
            await message.answer(
                "Этот Telegram уже привязан к другому аккаунту.\n"
                "Если это ошибка — обратись в поддержку.",
            )
        else:
            log.exception("confirm_link_code failed for user %s code %s", user.id, code)
            await message.answer("Не удалось привязать аккаунт. Попробуй позже.")
