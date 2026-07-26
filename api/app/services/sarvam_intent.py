"""Speech -> structured intent (Intent MVP contract v0).

Separate from sarvam_stt.py / sarvam_llm.py, which the full session pipeline
uses via raw REST calls. This slice uses the `sarvamai` SDK's streaming
translate socket directly — the contract calls this out as "the only
verified-working SDK pattern" for a one-shot (not incremental) transcription
per hold-to-talk turn, so it's implemented against the SDK's actual
`speech_to_text_translate_streaming` resource rather than the batch REST
endpoint.

Verified against `sarvamai==0.1.28` by introspecting the installed package
(connect() signature, socket client methods, response/error shapes) — not
guessed from docs, since none of this can be exercised end-to-end without a
real SARVAM_API_KEY.
"""

import base64
import io
import json
import wave

from sarvamai import AsyncSarvamAI

from app.config import SARVAM_API_KEY

_client = AsyncSarvamAI(api_subscription_key=SARVAM_API_KEY)


class SpeechTranslationError(Exception):
    pass


class IntentExtractionError(Exception):
    pass


def wrap_pcm16_as_wav(pcm_bytes: bytes, sample_rate: int = 16000, channels: int = 1) -> bytes:
    """Wraps raw 16-bit signed little-endian mono PCM (exactly what
    `web/lib/audio.ts`'s `floatTo16BitPCM` emits) into a minimal WAV
    container. `wave` writes the standard 44-byte header for us."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_bytes)
    return buffer.getvalue()


async def translate_speech_to_english(pcm_bytes: bytes, sample_rate: int = 16000) -> str:
    """One-shot STT+translate over a single held-button recording: wrap as
    WAV, open a streaming socket, send the whole clip in one `translate()`
    call, flush, and read until the first data/error frame. No interim
    transcript events — contract v0 decided that's simpler and matches the
    only pattern that's actually been verified against the live API."""
    if not pcm_bytes:
        raise SpeechTranslationError("empty audio buffer")

    wav_bytes = wrap_pcm16_as_wav(pcm_bytes, sample_rate=sample_rate)
    audio_b64 = base64.b64encode(wav_bytes).decode("ascii")

    async with _client.speech_to_text_translate_streaming.connect(
        model="saaras:v3",
        mode="translate",
        input_audio_codec="wav",
        sample_rate=str(sample_rate),
    ) as ws:
        await ws.translate(audio=audio_b64, encoding="audio/wav", sample_rate=sample_rate)
        await ws.flush()

        # VAD/event frames aren't enabled for this one-shot call, but drain
        # defensively rather than assuming the very first recv() is the
        # transcript.
        for _ in range(10):
            response = await ws.recv()
            if response.type == "data":
                return response.data.transcript
            if response.type == "error":
                raise SpeechTranslationError(f"{response.data.code}: {response.data.error}")

    raise SpeechTranslationError("socket closed before a transcript or error frame arrived")


INTENT_SYSTEM_PROMPT = """Extract structured intent from this technical screening answer.
Return ONLY this JSON, no prose, no markdown fences:
{"action": "short verb phrase for what they did", "key_entities": ["technology or concept names mentioned"], "summary": "one sentence summary"}"""


async def extract_intent(english_text: str) -> dict:
    """Separate call from translate_speech_to_english — this is the
    'structured intent' half of the slice, scoring/harness are explicitly
    deferred (contract v0)."""
    response = await _client.chat.completions(
        model="sarvam-30b",
        temperature=0.1,
        # Thinking mode is ON by default (reasoning_effort defaults to "low").
        # With it on, the model can put its answer in reasoning_content and
        # leave `content` as None — explicitly disabling it is required, not
        # optional, per the contract.
        reasoning_effort=None,
        messages=[
            {"role": "system", "content": INTENT_SYSTEM_PROMPT},
            {"role": "user", "content": english_text},
        ],
        # The Python SDK's chat.completions() has no direct response_format
        # kwarg, but it does accept one through request_options — verified
        # against the installed sarvamai package, not guessed.
        request_options={"additional_body_parameters": {"response_format": {"type": "json_object"}}},
    )
    content = response.choices[0].message.content
    if not content:
        raise IntentExtractionError(
            f"empty intent response from sarvam-30b (finish_reason={response.choices[0].finish_reason!r})"
        )
    content = content.strip()
    # Prompted for raw JSON; strip fences defensively in case the model
    # wraps it anyway despite JSON mode.
    if content.startswith("```"):
        content = content.strip("`")
        if content.startswith("json"):
            content = content[4:]
    return json.loads(content)
