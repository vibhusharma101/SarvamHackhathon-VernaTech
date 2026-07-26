"""Intent MVP (contract v0) — parallel vertical slice for "Speech -> Structured
Intent". Does NOT touch the existing `/sessions/{id}/stream` Pipecat WS or the
scoring/harness/sessions REST endpoints (see app/routers/ws.py and
app/routers/sessions.py) — those stay as-is for the full-pipeline build.

No Supabase here by design (contract v0: "No Supabase, no /sessions REST call
for this pass"). Session state is in-memory, per-process, keyed by a
client-generated session_id — acceptable because there's no persistence
requirement and a single Railway instance serves the demo.
"""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.db import get_client
from app.models import IntentBroadcast, StructuredIntent
from app.services.sarvam_intent import (
    SpeechTranslationError,
    extract_intent,
    transcribe_speech_original,
    translate_speech_to_english,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["intent-mvp"])

# session_id -> next turn_idx (starts at 0, increments per hold-release cycle)
_turn_counters: dict[str, int] = {}
# session_id -> set of connected console websockets to broadcast intents to
_console_sockets: dict[str, set[WebSocket]] = {}


async def _broadcast_intent(session_id: str, broadcast: IntentBroadcast) -> None:
    sockets = _console_sockets.get(session_id, set())
    payload = broadcast.model_dump_json()
    # Best-effort fan-out — one dead console tab shouldn't take down delivery
    # to the others still listening.
    for socket in list(sockets):
        try:
            await socket.send_text(payload)
        except Exception:
            sockets.discard(socket)


def _persist_turn(broadcast: IntentBroadcast) -> None:
    # Best-effort: a DB hiccup shouldn't break the live demo path, which
    # already got its answer via the console broadcast.
    try:
        get_client().table("intent_turn").insert(
            {
                "session_id": broadcast.session_id,
                "turn_idx": broadcast.turn_idx,
                "original_text": broadcast.original_text,
                "language_code": broadcast.language_code,
                "english_text": broadcast.english_text,
                "intent": broadcast.intent.model_dump(),
            }
        ).execute()
    except Exception:
        logger.exception("failed to persist intent_turn for session %s", broadcast.session_id)


@router.websocket("/ws/candidate/{session_id}")
async def candidate_stream(websocket: WebSocket, session_id: str):
    await websocket.accept()
    buffer = bytearray()

    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                return

            if message.get("bytes") is not None:
                buffer.extend(message["bytes"])
                continue

            if message.get("text") is not None:
                try:
                    event = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                if event.get("type") != "stop":
                    continue

                await websocket.send_json({"type": "ack", "status": "processing"})

                try:
                    audio_bytes = bytes(buffer)
                    # Sarvam has no single call that returns both the English
                    # gloss and the original-language transcript — two
                    # separate STT round-trips on the same audio, run
                    # concurrently rather than serially to not double the
                    # per-turn latency.
                    english_text, (original_text, language_code) = await asyncio.gather(
                        translate_speech_to_english(audio_bytes),
                        transcribe_speech_original(audio_bytes),
                    )
                    intent_dict = await extract_intent(english_text)

                    turn_idx = _turn_counters.get(session_id, 0)
                    _turn_counters[session_id] = turn_idx + 1

                    broadcast = IntentBroadcast(
                        session_id=session_id,
                        turn_idx=turn_idx,
                        original_text=original_text,
                        language_code=language_code,
                        english_text=english_text,
                        intent=StructuredIntent(**intent_dict),
                    )
                    await _broadcast_intent(session_id, broadcast)
                    await asyncio.to_thread(_persist_turn, broadcast)
                    await websocket.send_json({"type": "ack", "status": "done", "turn_idx": turn_idx})
                except SpeechTranslationError as e:
                    await websocket.send_json({"type": "error", "message": str(e)})
                except Exception as e:
                    # Sarvam LLM call failure, malformed intent JSON, etc. —
                    # connection stays open, candidate can hold-and-release
                    # again (contract v0: errors are non-fatal to the socket).
                    logger.exception("intent turn failed for session %s", session_id)
                    await websocket.send_json({"type": "error", "message": str(e)})
                finally:
                    buffer = bytearray()
    except WebSocketDisconnect:
        return


@router.websocket("/ws/console/{session_id}")
async def console_stream(websocket: WebSocket, session_id: str):
    await websocket.accept()
    _console_sockets.setdefault(session_id, set()).add(websocket)

    try:
        while True:
            # No client -> server messages required (contract v0); just hold
            # the connection open and detect disconnects.
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                return
    except WebSocketDisconnect:
        pass
    finally:
        _console_sockets.get(session_id, set()).discard(websocket)
