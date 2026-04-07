from aiogram.fsm.state import State, StatesGroup


class QuizStates(StatesGroup):
    """FSM states for the daily quiz flow."""

    answering = State()
