import uuid

import httpx

from app.core.config import settings


async def gigachat_reply(messages: list[dict], model: str = "GigaChat") -> str | None:
    """Return GigaChat reply text or None on any integration error."""
    creds = settings.GIGACHAT_CREDENTIALS
    if not creds:
        return None

    try:
        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            token_resp = await client.post(
                "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
                headers={
                    "Authorization": f"Basic {creds}",
                    "RqUID": str(uuid.uuid4()),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"scope": "GIGACHAT_API_PERS"},
            )
            token_resp.raise_for_status()
            access_token = token_resp.json()["access_token"]

        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            chat_resp = await client.post(
                "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                },
            )
            chat_resp.raise_for_status()
            return chat_resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return None
