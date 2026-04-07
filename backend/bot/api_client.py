"""HTTP client for talking to our FastAPI backend."""

import httpx

from bot.config import bot_settings


class BackendClient:
    def __init__(self):
        self.base = bot_settings.BACKEND_URL
        self.bot_token = bot_settings.TELEGRAM_BOT_TOKEN

    # ------------------------------------------------------------------ auth
    async def bot_auth(
        self,
        telegram_id: int,
        username: str | None,
        first_name: str | None,
        last_name: str | None = None,
    ) -> dict:
        """Return TokenResponse dict from POST /api/auth/bot."""
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                f"{self.base}/api/auth/bot",
                json={
                    "telegram_id": telegram_id,
                    "username": username,
                    "first_name": first_name,
                    "last_name": last_name,
                },
                headers={"X-Bot-Secret": self.bot_token},
            )
            r.raise_for_status()
            return r.json()

    # ----------------------------------------------------------------- users
    async def get_me(self, token: str) -> dict:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                f"{self.base}/api/users/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            r.raise_for_status()
            return r.json()

    # ----------------------------------------------------------------- quiz
    async def get_daily_quiz(self) -> dict | None:
        """Returns quiz dict or None if no quiz today."""
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{self.base}/api/quizzes/daily")
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()

    async def answer_quiz(
        self, token: str, quiz_id: int, answers: list[dict]
    ) -> dict:
        """POST /api/quizzes/answer. answers = [{question_id, selected_index}, ...]"""
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                f"{self.base}/api/quizzes/answer",
                json={"quiz_id": quiz_id, "answers": answers},
                headers={"Authorization": f"Bearer {token}"},
            )
            r.raise_for_status()
            return r.json()

    # -------------------------------------------------------------- leaderboard
    async def get_leaderboard(self, token: str | None = None) -> dict:
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{self.base}/api/leaderboard", headers=headers)
            r.raise_for_status()
            return r.json()


backend = BackendClient()
