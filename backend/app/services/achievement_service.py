"""Достижения считаются на сервере по прогрессу — единый источник правды для клиента."""

from __future__ import annotations

from typing import Callable


def build_achievement_payload(stats: dict) -> list[dict]:
    checks: list[tuple[str, str, str, str, Callable[[dict], bool]]] = [
        (
            "welcome",
            "👋",
            "Добро пожаловать",
            "Создай аккаунт и зайди в приложение",
            lambda s: s["xp"] >= 0,
        ),
        (
            "first_xp",
            "⭐",
            "Первая звезда",
            "Заработай хотя бы 50 очков опыта",
            lambda s: s["xp"] >= 50,
        ),
        (
            "learner",
            "📚",
            "Ученик",
            "Набери 200 очков опыта",
            lambda s: s["xp"] >= 200,
        ),
        (
            "expert",
            "🏆",
            "Знаток",
            "Набери 1000 очков опыта",
            lambda s: s["xp"] >= 1000,
        ),
        (
            "scenario_starter",
            "🎯",
            "Первый шаг",
            "Пройди один сценарий",
            lambda s: s["scenarios_done"] >= 1,
        ),
        (
            "scenario_runner",
            "🗺️",
            "Исследователь",
            "Пройди 3 сценария",
            lambda s: s["scenarios_done"] >= 3,
        ),
        (
            "game_fan",
            "🎮",
            "Игрок",
            "Сыграй в мини-игры 5 раз",
            lambda s: s["games_played"] >= 5,
        ),
        (
            "streak_3",
            "🔥",
            "Три дня огня",
            "Серия активности 3 дня",
            lambda s: s["streak"] >= 3,
        ),
        (
            "streak_7",
            "🌋",
            "Неделя силы",
            "Серия активности 7 дней",
            lambda s: s["streak"] >= 7,
        ),
        (
            "collector",
            "🪙",
            "Копилка",
            "Накопи 100 монет",
            lambda s: s["coins"] >= 100,
        ),
        (
            "scenario_marathon",
            "🎬",
            "Марафон сценариев",
            "Пройди 5 сценариев",
            lambda s: s["scenarios_done"] >= 5,
        ),
        (
            "arcade_regular",
            "🕹️",
            "Зал игр",
            "Сыграй в мини-игры 10 раз",
            lambda s: s["games_played"] >= 10,
        ),
    ]

    return [
        {
            "id": cid,
            "icon": icon,
            "title": title,
            "description": desc,
            "completed": fn(stats),
        }
        for cid, icon, title, desc, fn in checks
    ]
