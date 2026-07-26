"""Fixed 4-question rubric interview — the real MVP flow, wired to the same
`session`/`turn`/`scoring_pass` schema and scoring pipeline the full TRD
design uses (see api/sql/schema.sql, app/services/scoring_service.py).

Deliberately simpler than the TRD's Pipecat pipeline: no dynamic follow-ups,
no live streaming transcript — a fixed question list, one-shot translate per
answer (the same proven pattern from app/services/sarvam_intent.py), and a
real scoring pass fired automatically once all 4 answers are in.

No auth or role-based access — anyone holding a session_id can drive it or
read it back. Explicit scope decision for the hackathon, not an oversight.
"""

import asyncio
import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Body, HTTPException, WebSocket, WebSocketDisconnect

from app.db import get_client
from app.services.sarvam_intent import (
    SpeechTranslationError,
    transcribe_speech_original,
    translate_speech_to_english,
)
from app.services.scoring_service import run_scoring_pass
from app.services.term_correction import correct_technical_terms

logger = logging.getLogger(__name__)

router = APIRouter(tags=["interview"])

ROLE_TITLE = "Backend Engineer"  # matches api/sql/seed.py

QUESTIONS = [
    "Let's start with how you handle real-world system failures in production. "
    "Can you tell me about a tricky bug or outage you diagnosed in a live system? "
    "What was the symptom, how did you investigate it, and how did you fix it?",
    "Next, let's talk about database and schema design. Tell me about a database "
    "schema or data structure you designed for a core feature. Why did you "
    "structure it that way, and what other option did you reject?",
    "Finally, let's cover performance and concurrent load. How have you handled "
    "high traffic, concurrent users, or race conditions in your backend? "
    "What specific mechanism did you use?",
    "Tell me about a technical trade-off you made. What did you choose, what "
    "was the alternative, and what was the cost of your decision?",
]

# Which rubric criterion each question is actually asking about, by turn idx.
# Mapped by NAME (matching api/sql/seed.py) rather than relying on the order
# rows happen to come back from the DB in. scoring_service.py uses this to
# gate evidence to the turn that answers each criterion — without it, all 4
# answers get concatenated into one blob and a candidate who flatly refuses
# the trade-off question still scores 4 on it, because the scorer finds
# trade-off-shaped language in an earlier answer. Measured: that single
# change took criterion accuracy from 75% to 94% on evals/score_eval.py.
QUESTION_CRITERIA = [
    "Production debugging",
    "Data modelling",
    "Concurrency / scale behaviour",
    "Trade-off articulation",
]

_DEVANAGARI_RE = re.compile(r"[ऀ-ॿ]")
_MIN_WORDS_PER_SCRIPT = 3  # a stray acronym or product name isn't code-switching


def _detect_display_language(original_text: str, language_code: str) -> str:
    """Sarvam's language_code is always a single value — it has no way to
    say "code-mixed", so genuine Hinglish speech just gets bucketed into
    whichever script had more words. Detected here instead, straight from
    the transcript: if both Devanagari and Latin-script words show up in
    real quantity (not just one stray English acronym), label it
    "hinglish" for display/storage, overriding Sarvam's single guess."""
    words = original_text.split()
    devanagari_words = sum(1 for w in words if _DEVANAGARI_RE.search(w))
    latin_words = sum(1 for w in words if sum(c.isascii() and c.isalpha() for c in w) >= 2)
    if devanagari_words >= _MIN_WORDS_PER_SCRIPT and latin_words >= _MIN_WORDS_PER_SCRIPT:
        return "hinglish"
    return language_code


@router.post("/interview/start")
def start_interview(body: dict = Body(default={})):
    db = get_client()

    role = db.table("role").select("id").eq("title", ROLE_TITLE).limit(1).execute()
    if not role.data:
        raise HTTPException(
            status_code=500,
            detail=f"role '{ROLE_TITLE}' not seeded — run api/sql/seed.py against this Supabase project first",
        )
    role_id = role.data[0]["id"]

    # Candidate types their name on the entry page so the console shows
    # "Priya Sharma" instead of an opaque "Candidate a1b2c3d4" — falls back
    # to the generated placeholder if left blank, never a hard requirement.
    name = (body.get("name") or "").strip() or f"Candidate {uuid.uuid4().hex[:8]}"

    candidate = db.table("candidate").insert({"name": name, "role_id": role_id}).execute()
    candidate_id = candidate.data[0]["id"]

    session = (
        db.table("session")
        .insert(
            {
                "candidate_id": candidate_id,
                "role_id": role_id,
                # No language picker in this flow — Sarvam's translate mode
                # auto-detects the spoken language per turn, so these are
                # descriptive metadata, not something the STT call needs.
                "language_condition": "vernacular",
                "spoken_language": "auto",
            }
        )
        .execute()
    )
    session_id = session.data[0]["id"]

    return {"session_id": session_id, "questions": QUESTIONS}


def _iso(epoch_seconds: float) -> str:
    return datetime.fromtimestamp(epoch_seconds, tz=timezone.utc).isoformat()


def _persist_turn(
    session_id: str,
    idx: int,
    original_text: str,
    language_code: str,
    english_text: str,
    t_speech_end: str,
    t_asr_final: str,
) -> None:
    try:
        # Upsert on (session_id, idx), not insert — a client retry on the
        # same question index (e.g. reconnect right after a turn lands but
        # before the ack is received) must overwrite, not crash on the
        # unique constraint.
        #
        # Only speech_end -> asr_final is real for this flow: unlike the
        # TRD's live Pipecat pipeline, there's no per-turn LLM response or
        # TTS here (questions are fixed, scoring runs once at the end across
        # all 4 turns) — t_llm_first_token/t_tts_first_byte/t_playback_start
        # genuinely don't apply and are left null rather than faked.
        get_client().table("turn").upsert(
            {
                "session_id": session_id,
                "idx": idx,
                "asr_original_text": original_text,
                "asr_lang": language_code,
                "asr_english_gloss": english_text,
                "t_speech_end": t_speech_end,
                "t_asr_final": t_asr_final,
            },
            on_conflict="session_id,idx",
        ).execute()
    except Exception:
        logger.exception("failed to persist turn %s for session %s", idx, session_id)


@router.websocket("/ws/interview/{session_id}")
async def interview_stream(websocket: WebSocket, session_id: str):
    await websocket.accept()
    buffer = bytearray()

    # Resume from wherever this session's already-persisted turns leave off —
    # a reconnect (dropped wifi, accidental refresh) must not restart the
    # interview from question 0 and overwrite what was already answered.
    db = get_client()
    existing_turns = (
        db.table("turn").select("idx").eq("session_id", session_id).order("idx", desc=True).limit(1).execute()
    )
    current_idx = (existing_turns.data[0]["idx"] + 1) if existing_turns.data else 0

    if current_idx >= len(QUESTIONS):
        existing_pass = (
            db.table("scoring_pass")
            .select("id, criterion_result(criterion_id)")
            .eq("session_id", session_id)
            .eq("is_current", True)
            .limit(1)
            .execute()
        )
        # A pass row alone isn't proof of a scored session — it must actually
        # carry results. Checking only for the row's existence once let a
        # failed run's leftover pass permanently block re-scoring.
        scored_pass = (
            existing_pass.data[0]
            if existing_pass.data and existing_pass.data[0].get("criterion_result")
            else None
        )
        if scored_pass:
            # Already fully answered and scored — don't burn another live
            # scoring pass on a stray reconnect.
            await websocket.send_json(
                {"type": "complete", "session_id": session_id, "scoring_pass_id": scored_pass["id"]}
            )
        else:
            try:
                scoring_pass_id = await run_scoring_pass(db, session_id)
                await websocket.send_json(
                    {"type": "complete", "session_id": session_id, "scoring_pass_id": scoring_pass_id}
                )
            except Exception as e:
                # Any scoring failure (ScoringError, an LLM content hiccup
                # like the sarvam_llm.py content=None case, a network blip)
                # should still land the candidate on "complete", not a raw
                # turn-level error — the interview itself is genuinely done.
                logger.exception("scoring failed on resume for session %s", session_id)
                await websocket.send_json(
                    {"type": "complete", "session_id": session_id, "scoring_pass_id": None, "error": str(e)}
                )
        return

    await websocket.send_json(
        {
            "type": "question",
            "idx": current_idx,
            "total": len(QUESTIONS),
            "text": QUESTIONS[current_idx],
        }
    )

    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                return

            if message.get("bytes") is not None:
                buffer.extend(message["bytes"])
                continue

            if message.get("text") is None:
                continue

            try:
                event = json.loads(message["text"])
            except json.JSONDecodeError:
                continue

            if event.get("type") != "stop":
                continue

            if not buffer:
                await websocket.send_json({"type": "error", "message": "empty audio buffer"})
                continue

            # Speech-end is the moment the server sees the "stop" signal —
            # the client held the mic until this point, so this is the real
            # end-of-speech instant, not an approximation.
            t_speech_end = time.time()
            await websocket.send_json({"type": "ack", "status": "processing"})

            try:
                audio_bytes = bytes(buffer)
                buffer = bytearray()

                # Same concurrent transcribe+translate pattern as the Intent
                # MVP slice (app/services/sarvam_intent.py) — one call for
                # the English gloss the scorer reads, one for the
                # original-language audit trail, run together so this turn
                # doesn't pay for two round-trips serially.
                english_text, (original_text, language_code) = await asyncio.gather(
                    translate_speech_to_english(audio_bytes),
                    transcribe_speech_original(audio_bytes),
                )
                language_code = _detect_display_language(original_text, language_code)

                # Repair technical terms the ASR mangled phonetically before
                # anything reads them ("A-Disk" -> Redis, "Konkan" ->
                # concurrency). Corrected text is what gets persisted, so the
                # scorer AND the recruiter's transcript panel both see the
                # real terms. Best-effort — falls back to the raw gloss on any
                # failure (app/services/term_correction.py).
                english_text = await correct_technical_terms(english_text)

                t_asr_final = time.time()
                await asyncio.to_thread(
                    _persist_turn,
                    session_id,
                    current_idx,
                    original_text,
                    language_code,
                    english_text,
                    _iso(t_speech_end),
                    _iso(t_asr_final),
                )

                await websocket.send_json(
                    {"type": "ack", "status": "done", "turn_idx": current_idx, "language_code": language_code}
                )

                current_idx += 1
                if current_idx < len(QUESTIONS):
                    await websocket.send_json(
                        {
                            "type": "question",
                            "idx": current_idx,
                            "total": len(QUESTIONS),
                            "text": QUESTIONS[current_idx],
                        }
                    )
                else:
                    try:
                        scoring_pass_id = await run_scoring_pass(db, session_id)
                        await websocket.send_json(
                            {
                                "type": "complete",
                                "session_id": session_id,
                                "scoring_pass_id": scoring_pass_id,
                            }
                        )
                    except Exception as e:
                        logger.exception("scoring failed for session %s", session_id)
                        await websocket.send_json(
                            {
                                "type": "complete",
                                "session_id": session_id,
                                "scoring_pass_id": None,
                                "error": str(e),
                            }
                        )
            except SpeechTranslationError as e:
                # Turn index does NOT advance — candidate can just record
                # this answer again.
                await websocket.send_json({"type": "error", "message": str(e)})
            except Exception as e:
                logger.exception("interview turn failed for session %s", session_id)
                await websocket.send_json({"type": "error", "message": str(e)})
    except WebSocketDisconnect:
        return
