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
from app.models import CategoryVerdict, IntentBroadcast, SessionVerdict, StructuredIntent
from app.services.sarvam_intent import (
    SpeechTranslationError,
    extract_intent,
    transcribe_speech_original,
    translate_speech_to_english,
)
from app.services.sarvam_verdict import aggregate_category_verdict, aggregate_session_verdict, evaluate_verdict

logger = logging.getLogger(__name__)

router = APIRouter(tags=["intent-mvp"])

# Hacky-by-design, per explicit instruction: extract_intent's auto-classified
# `category` is unreliable exactly where it matters (verified live —
# misclassified the demo script's Q5 RabbitMQ trade-off answer as "System /
# Data Design"), which would make the verdict layer check the wrong 4
# features. Since the demo's 5 questions are asked in a known, fixed order,
# override category-by-turn-index instead of trusting the model's guess.
# Falls back to the model's classification past the scripted 5 turns.
DEMO_CATEGORY_SEQUENCE = [
    "Debugging & Diagnosis",
    "System / Data Design",
    "Scale & Concurrency",
    "Scale & Concurrency",  # demo Q4: refusal-state test, same category, weak answer
    "Trade-off Reasoning",
]

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


def _persist_turn(
    session_id: str,
    turn_idx: int,
    original_text: str,
    language_code: str,
    english_text: str,
    intent_dict: dict,
    category_verdict_dict: dict,
) -> None:
    # Best-effort: a DB hiccup shouldn't break the live demo path, which
    # already got its answer via the console broadcast.
    try:
        # upsert, not insert: _turn_counters is in-memory and resets on every
        # process restart (dev --reload, prod redeploy), but session_id
        # survives restarts since it's just a UUID in the URL — a fresh
        # counter can collide with a row already persisted pre-restart.
        get_client().table("intent_turn").upsert(
            {
                "session_id": session_id,
                "turn_idx": turn_idx,
                "original_text": original_text,
                "language_code": language_code,
                "english_text": english_text,
                "intent": intent_dict,
                "verdict": category_verdict_dict,
            },
            on_conflict="session_id,turn_idx",
        ).execute()
    except Exception:
        logger.exception("failed to persist intent_turn for session %s", session_id)


def _compute_session_verdict(session_id: str) -> dict:
    """Recomputed fresh from every persisted turn each time, rather than
    stored — hacky-by-design, no SessionVerdict table. Latest turn per
    category wins, so a stronger retry naturally supersedes an earlier weak
    answer in the same category."""
    try:
        rows = (
            get_client()
            .table("intent_turn")
            .select("turn_idx, verdict")
            .eq("session_id", session_id)
            .order("turn_idx", desc=True)
            .execute()
            .data
        )
    except Exception:
        logger.exception("failed to compute session verdict for session %s", session_id)
        return {"overall_verdict": "do_not_advance", "categories_passed": 0, "categories_total": 0}

    latest_per_category: dict[str, dict] = {}
    for row in rows:
        verdict = row.get("verdict")
        if not verdict:
            continue
        category = verdict.get("category")
        if category and category not in latest_per_category:
            latest_per_category[category] = verdict

    return aggregate_session_verdict(list(latest_per_category.values()))


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

                    if turn_idx < len(DEMO_CATEGORY_SEQUENCE):
                        intent_dict["category"] = DEMO_CATEGORY_SEQUENCE[turn_idx]

                    # Verdict layer: consumes the category extract_intent (or
                    # the demo-sequence override above) picked, doesn't redo
                    # STT/intent extraction.
                    feature_results = await evaluate_verdict(intent_dict["category"], english_text)
                    category_verdict_dict = aggregate_category_verdict(intent_dict["category"], feature_results)

                    await asyncio.to_thread(
                        _persist_turn,
                        session_id,
                        turn_idx,
                        original_text,
                        language_code,
                        english_text,
                        intent_dict,
                        category_verdict_dict,
                    )
                    session_verdict_dict = await asyncio.to_thread(_compute_session_verdict, session_id)

                    broadcast = IntentBroadcast(
                        session_id=session_id,
                        turn_idx=turn_idx,
                        original_text=original_text,
                        language_code=language_code,
                        english_text=english_text,
                        intent=StructuredIntent(**intent_dict),
                        category_verdict=CategoryVerdict(**category_verdict_dict),
                        session_verdict=SessionVerdict(**session_verdict_dict),
                    )
                    await _broadcast_intent(session_id, broadcast)
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
