"""Handler for /daily_quiz command and inline quiz flow."""

import logging

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, User

from bot.api_client import backend
from bot.keyboards.quiz import question_keyboard, share_keyboard
from bot.states import QuizStates

log = logging.getLogger(__name__)
router = Router()


# ── helpers ──────────────────────────────────────────────────────────────────

def _question_text(idx: int, total: int, q: dict) -> str:
    return (
        f"❓ <b>Вопрос {idx + 1} из {total}</b>\n\n"
        f"{q['text']}"
    )


async def _send_question(target: Message, idx: int, questions: list[dict]) -> None:
    q = questions[idx]
    await target.answer(
        _question_text(idx, len(questions), q),
        reply_markup=question_keyboard(q),
        parse_mode="HTML",
    )


# ── entry points ─────────────────────────────────────────────────────────────

async def start_daily_quiz(message: Message, tg_user: User, state: FSMContext) -> None:
    """Shared logic used by /daily_quiz command and menu callback."""
    await state.clear()

    # 1. Auth → get JWT
    try:
        auth = await backend.bot_auth(
            telegram_id=tg_user.id,
            username=tg_user.username,
            first_name=tg_user.first_name,
            last_name=tg_user.last_name,
        )
        token = auth["access_token"]
    except Exception:
        log.exception("bot_auth failed")
        await message.answer("Ошибка авторизации. Попробуй /start ещё раз.")
        return

    # 2. Fetch quiz
    try:
        quiz = await backend.get_daily_quiz()
    except Exception:
        log.exception("get_daily_quiz failed")
        await message.answer("Не удалось загрузить квиз. Попробуй позже.")
        return

    if quiz is None:
        await message.answer("📅 На сегодня квиза нет. Загляни завтра!")
        return

    questions = quiz.get("questions", [])
    if not questions:
        await message.answer("Квиз сегодня пуст. Загляни завтра!")
        return

    # Store state
    await state.set_state(QuizStates.answering)
    await state.update_data(
        token=token,
        quiz_id=quiz["id"],
        quiz_title=quiz.get("title", "Квиз дня"),
        questions=questions,
        current_idx=0,
        answers=[],
    )

    await message.answer(
        f"📝 <b>{quiz.get('title', 'Квиз дня')}</b>\n"
        f"Всего вопросов: {len(questions)}  |  Награда: {quiz.get('xp_reward', 0)} XP\n\n"
        "Поехали!",
        parse_mode="HTML",
    )
    await _send_question(message, 0, questions)


@router.message(Command("daily_quiz"))
async def cmd_daily_quiz(message: Message, state: FSMContext):
    await start_daily_quiz(message, message.from_user, state)


# ── answer callback ───────────────────────────────────────────────────────────

@router.callback_query(QuizStates.answering, F.data.startswith("qa:"))
async def process_answer(callback: CallbackQuery, state: FSMContext):
    await callback.answer()

    _, q_id_str, sel_str = callback.data.split(":")
    question_id = int(q_id_str)
    selected_index = int(sel_str)

    data = await state.get_data()
    questions: list[dict] = data["questions"]
    answers: list[dict] = data["answers"]
    current_idx: int = data["current_idx"]

    answers.append({"question_id": question_id, "selected_index": selected_index})
    next_idx = current_idx + 1

    if next_idx < len(questions):
        # More questions
        await state.update_data(current_idx=next_idx, answers=answers)
        await callback.message.edit_reply_markup(reply_markup=None)
        await _send_question(callback.message, next_idx, questions)
        return

    # ── All questions answered → submit ──────────────────────────────────────
    await callback.message.edit_reply_markup(reply_markup=None)

    try:
        result = await backend.answer_quiz(
            token=data["token"],
            quiz_id=data["quiz_id"],
            answers=answers,
        )
    except Exception:
        log.exception("answer_quiz failed")
        await callback.message.answer("Ошибка при отправке ответов. Попробуй позже.")
        await state.clear()
        return

    await state.clear()

    correct = result["correct_count"]
    total = result["total_questions"]
    xp = result["xp_earned"]
    pct = round(correct / total * 100) if total else 0

    if pct == 100:
        emoji = "🏆"
    elif pct >= 60:
        emoji = "✅"
    else:
        emoji = "📉"

    summary = (
        f"{emoji} <b>Квиз завершён!</b>\n\n"
        f"Правильных ответов: <b>{correct} / {total}</b> ({pct}%)\n"
        f"Заработано XP: <b>+{xp}</b> ⚡"
    )

    share_text = (
        f"Прошёл квиз дня и набрал {correct}/{total} ({pct}%)! "
        f"Заработал +{xp} XP ⚡ Попробуй сам! @{{}}"
    )

    await callback.message.answer(
        summary,
        reply_markup=share_keyboard(share_text),
        parse_mode="HTML",
    )
