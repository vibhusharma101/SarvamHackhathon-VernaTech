"""Bulbul v3 TTS — REST call shape from TRD §3.6."""

import httpx

from app.config import SARVAM_API_KEY

BASE_URL = "https://api.sarvam.ai"


async def synthesize(text: str, target_language_code: str, speaker: str = "shubh", pace: float = 1.0) -> str:
    """Returns base64 audio. Caller streams it to the client as an
    `agent_speaking` WS event (TRD §4). Verify te-IN/hi-IN are audible before
    relying on this in a demo — coverage mismatch fails silently."""
    if len(text) > 2500:
        raise ValueError("Bulbul v3 caps inputs at 2500 chars per TRD §3.6")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/text-to-speech",
            headers={"Authorization": f"Bearer {SARVAM_API_KEY}"},
            json={
                "inputs": [text],
                "target_language_code": target_language_code,
                "model": "bulbul:v3",
                "speaker": speaker,
                "pace": pace,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["audios"][0]
