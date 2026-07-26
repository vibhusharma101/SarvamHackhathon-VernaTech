"""Saaras v3 STT — batch translate path (TRD §3.3) used for the English gloss
and the file-upload fallback. The live streaming WS path (§3.2) is wired inside
services/pipecat_pipeline.py, not here — streaming is a Pipecat-managed
connection, not a plain REST call."""

import httpx

from app.config import SARVAM_API_KEY

BASE_URL = "https://api.sarvam.ai"


async def translate_segment(wav_bytes: bytes) -> dict:
    """Batch mode=translate on a single <=30s WAV segment. For answers over
    30s, split on VAD silence boundaries before calling this (TRD §3.1) —
    never cut at arbitrary time offsets."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/speech-to-text",
            headers={"Authorization": f"Bearer {SARVAM_API_KEY}"},
            files={"file": ("segment.wav", wav_bytes, "audio/wav")},
            data={"model": "saaras:v3", "mode": "translate"},
        )
        resp.raise_for_status()
        return resp.json()


def concatenate_glosses(segment_glosses: list[str]) -> str:
    """Segments must already be in VAD order — this just joins them."""
    return " ".join(s.strip() for s in segment_glosses if s.strip())
