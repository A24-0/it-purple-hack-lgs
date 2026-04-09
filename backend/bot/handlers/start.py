"""Handlers for /start, /help, and main menu callbacks."""

import logging

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from bot.api_client import backend
from bot.keyboards.quiz import main_menu_keyboard

log = logging.getLogger(__name__)
router = Router()

HELP_TEXT = (
    "📚 <b>Доступные команды:</b>\n\n"
    "/start — главное меню\n"
    "/help — эта справка\n"
    "/daily_quiz — квиз дня (1–3 вопроса)\n"
    "/streak — мой текущий стрик\n"
    "/app — открыть полное приложение\n"
    "/link &lt;код&gt; — привязать аккаунт приложения к Telegram\n\n"
    "Отвечай на вопросы, зарабатывай XP и прокачивай стрик! 🔥"
)


def _app_keyboard() -> InlineKeyboardMarkup:
    from bot.config import bot_settings
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть мини-приложение",
                    web_app=WebAppInfo(url=bot_settings.WEBAPP_URL),
                )
            ]
        ]
    )


@router.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()

    user = message.from_user
    try:
        await backend.bot_auth(
            telegram_id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
        )
    except Exception:
        log.exception("bot_auth failed for user %s", user.id)

    name = user.first_name or user.username or "друг"
    await message.answer(
        f"Привет, <b>{name}</b>! 👋\n\n"
        "Я бот для прокачки IT-навыков. Решай квизы, копи стрики и соревнуйся в лидерборде.\n\n"
        "Выбери действие:",
        reply_markup=main_menu_keyboard(),
        parse_mode="HTML",
    )


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(HELP_TEXT, parse_mode="HTML")


@router.message(Command("app"))
async def cmd_app(message: Message):
    from bot.config import bot_settings
    if not bot_settings.WEBAPP_URL or not bot_settings.WEBAPP_URL.startswith("http"):
        await message.answer("WEBAPP_URL не настроен. Добавь https URL в backend/.env и перезапусти bot.")
        return
    await message.answer("Открывай мини-приложение:", reply_markup=_app_keyboard())


# ── menu callbacks ──────────────────────────────────────────────────────────

@router.callback_query(F.data == "menu:streak")
async def menu_streak(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    # delegate to streak handler by forwarding as a synthetic message text
    from bot.handlers.streak import show_streak  # local import to avoid circular
    await show_streak(callback.message, callback.from_user)


@router.callback_query(F.data == "menu:daily_quiz")
async def menu_quiz(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    from bot.handlers.quiz import start_daily_quiz
    await start_daily_quiz(callback.message, callback.from_user, state)


@router.callback_query(F.data == "menu:leaderboard")
async def menu_leaderboard(callback: CallbackQuery):
    await callback.answer()
    try:
        data = await backend.get_leaderboard()
        entries = data.get("entries", [])[:10]
        if not entries:
            await callback.message.answer("Лидерборд пока пуст.")
            return

        lines = ["🏆 <b>Топ-10 лидерборда:</b>\n"]
        for e in entries:
            name = e.get("first_name") or e.get("username") or "Аноним"
            lines.append(
                f"{e['rank']}. {name} — {e['total_xp']} XP  🔥{e['streak_days']}"
            )
        await callback.message.answer("\n".join(lines), parse_mode="HTML")
    except Exception:
        log.exception("leaderboard fetch failed")
        await callback.message.answer("Не удалось загрузить лидерборд. Попробуй позже.")
