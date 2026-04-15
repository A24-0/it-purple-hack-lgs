"""Один демо-сценарий в пустой БД — чтобы список на главной не был пустым."""

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.scenario import Scenario, ScenarioStep


async def ensure_demo_scenario() -> None:
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(Scenario).limit(1))
        if r.scalars().first():
            return

        sc = Scenario(
            title="Первый смартфон",
            description="Купил дорогой телефон — стоит ли страховать?",
            category="life",
            difficulty=1,
            xp_reward=60,
        )
        db.add(sc)
        await db.flush()

        steps = [
            {
                "order": 0,
                "prompt": "Ты купил новый смартфон за 90 000 руб. Продавец предлагает страховку за 5 000 руб/год. Что делаешь?",
                "choices": [
                    {
                        "text": "Оформляю страховку — мало ли что случится",
                        "is_correct": True,
                        "feedback": "Отлично: небольшая премия при дорогом устройстве — разумная защита.",
                    },
                    {
                        "text": "Не нужно, телефон новый",
                        "is_correct": False,
                        "feedback": "Рискованно: повреждения и кражи случаются часто.",
                    },
                    {
                        "text": "Только чехол",
                        "is_correct": False,
                        "feedback": "Чехол не заменит страховку от кражи и залития.",
                    },
                ],
            },
            {
                "order": 1,
                "prompt": "Через месяц разбил экран — ремонт 15 000 руб. У тебя есть полис. Что делаешь?",
                "choices": [
                    {
                        "text": "Обращаюсь в страховую по полису",
                        "is_correct": True,
                        "feedback": "Верно: так и работает страхование.",
                    },
                    {
                        "text": "Плачу сам, чтобы не возиться",
                        "is_correct": False,
                        "feedback": "Полис как раз для того, чтобы снизить такие расходы.",
                    },
                ],
            },
        ]

        for s in steps:
            st = ScenarioStep(
                scenario_id=sc.id,
                order=s["order"],
                prompt=s["prompt"],
                choices=s["choices"],
                correct_answer=None,
            )
            db.add(st)

        await db.commit()
