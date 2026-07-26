"""Pipecat wiring — VAD + barge-in (TRD §3.7). This is the piece that needs a
live SARVAM_API_KEY and a running WS session to actually exercise, so it's
scaffolded to the documented shape and left for the pipeline dev to wire into
the WS route (app/routers/ws.py) during the build window — see .vii/plan.md
"Explicitly deferred" section.
"""

from pipecat.services.sarvam.stt import SarvamSTTService
from pipecat.services.sarvam.tts import SarvamTTSService

from app.config import SARVAM_API_KEY


def build_stt(language_code: str) -> SarvamSTTService:
    return SarvamSTTService(
        api_key=SARVAM_API_KEY,
        model="saaras:v3",
        language_code=language_code,
        vad_signals=True,
        high_vad_sensitivity=True,
        keepalive=True,
    )


def build_tts(speaker: str = "shubh") -> SarvamTTSService:
    return SarvamTTSService(api_key=SARVAM_API_KEY, model="bulbul:v3", speaker=speaker)


# TODO(pipeline dev): wire into the session's Pipecat pipeline —
#   - UserStartedSpeaking while TTS is playing -> cancel current TTS
#     (that IS barge-in; emit {"type": "barge_in_ack"} on the session WS).
#   - UserStoppedSpeaking -> close the turn buffer, upload the segment to
#     Supabase Storage (`turn-audio` bucket), and fire
#     services.sarvam_stt.translate_segment(...) asynchronously — it should
#     run concurrently with follow-up generation, not block it (TRD §3.1).
