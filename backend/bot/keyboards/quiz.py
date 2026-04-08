from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder
from bot.config import bot_settings


def question_keyboard(question: dict) -> InlineKeyboardMarkup:
    """Build an inline keyboard for a quiz question.

    callback_data format: qa:{question_id}:{option_index}
    """
    builder = InlineKeyboardBuilder()
    options: list[str] = question["options"]
    q_id = question["id"]

    labels = ["A", "B", "C", "D", "E"]
    for idx, option in enumerate(options):
        label = labels[idx] if idx < len(labels) else str(idx + 1)
        builder.add(
            InlineKeyboardButton(
                text=f"{label}) {option}",
                callback_data=f"qa:{q_id}:{idx}",
            )
        )

    builder.adjust(1)  # one button per row for readability
    return builder.as_markup()


def share_keyboard(result_text: str) -> InlineKeyboardMarkup:
    """Share-result button using switch_inline_query."""
    builder = InlineKeyboardBuilder()
    builder.add(
        InlineKeyboardButton(
            text="🔗 Поделиться результатом",
            switch_inline_query=result_text,
        )
    )
    return builder.as_markup()


def main_menu_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="📝 Квиз дня", callback_data="menu:daily_quiz"),
        InlineKeyboardButton(text="🔥 Мой стрик", callback_data="menu:streak"),
    )
    builder.row(
        InlineKeyboardButton(text="🏆 Лидерборд", callback_data="menu:leaderboard"),
    )
    if bot_settings.WEBAPP_URL and bot_settings.WEBAPP_URL.startswith("http"):
        builder.row(
            InlineKeyboardButton(
                text="Открыть мини-приложение",
                web_app=WebAppInfo(url=bot_settings.WEBAPP_URL),
            ),
        )
    return builder.as_markup()
