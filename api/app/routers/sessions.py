from fastapi import APIRouter, HTTPException, UploadFile

from app.db import get_client
from app.models import CreateSessionRequest, CreateSessionResponse
from app.routers.interview import QUESTIONS
from app.services.latency import session_latency
from app.services.sarvam_stt import translate_segment

router = APIRouter(tags=["sessions"])


@router.post("/sessions", response_model=CreateSessionResponse)
def create_session(body: CreateSessionRequest):
    db = get_client()
    row = (
        db.table("session")
        .insert(
            {
                "candidate_id": body.candidate_id,
                "role_id": body.role_id,
                "language_condition": body.language_condition.value,
                "spoken_language": body.spoken_language,
            }
        )
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=500, detail="failed to create session")
    return CreateSessionResponse(session_id=row.data[0]["id"])


@router.get("/sessions")
def list_sessions():
    db = get_client()
    result = (
        db.table("session")
        .select("*, candidate(name), role(title)")
        .order("started_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/sessions/{session_id}/scorecard")
def get_scorecard(session_id: str):
    db = get_client()
    passes = (
        db.table("scoring_pass")
        .select("id")
        .eq("session_id", session_id)
        .eq("is_current", True)
        .limit(1)
        .execute()
    )
    if not passes.data:
        raise HTTPException(status_code=404, detail="no scoring pass for this session yet")
    scoring_pass_id = passes.data[0]["id"]

    criteria = (
        db.table("criterion_result")
        .select("*, rubric_criterion(name)")
        .eq("scoring_pass_id", scoring_pass_id)
        .execute()
    )
    proficiency = (
        db.table("language_proficiency").select("*").eq("session_id", session_id).limit(1).execute()
    )

    scored = [c for c in criteria.data if c["status"] == "scored"]
    overall = sum(c["score"] for c in scored) / len(scored) if scored else None

    return {
        "session_id": session_id,
        "scoring_pass_id": scoring_pass_id,
        "criteria": criteria.data,
        "criteria_scored": len(scored),
        "criteria_insufficient": len(criteria.data) - len(scored),
        "overall": overall,
        "language_proficiency": proficiency.data[0] if proficiency.data else None,
    }


@router.get("/sessions/{session_id}/turns")
def get_turns(session_id: str):
    """Per-turn transcript — original language AND the English gloss the
    scorer actually reads, side by side. This is the recruiter-facing eval
    view: what the candidate said in their own words, not just the
    translation. `question` is zipped in from the fixed interview question
    list by idx (api/app/routers/interview.py) — turns from that flow map
    1:1 to it; older/other flows just won't have a matching question."""
    db = get_client()
    turns = db.table("turn").select("*").eq("session_id", session_id).order("idx").execute()
    return [
        {
            "idx": t["idx"],
            "question": QUESTIONS[t["idx"]] if 0 <= t["idx"] < len(QUESTIONS) else None,
            "original_text": t.get("asr_original_text"),
            "language_code": t.get("asr_lang"),
            "english_text": t.get("asr_english_gloss"),
            "is_clarification": t.get("is_clarification", False),
        }
        for t in turns.data
    ]


@router.get("/sessions/{session_id}/note")
def get_session_note(session_id: str):
    db = get_client()
    row = db.table("session").select("recruiter_note").eq("id", session_id).limit(1).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="session not found")
    return {"note": row.data[0].get("recruiter_note")}


@router.post("/sessions/{session_id}/upload")
async def upload_fallback_audio(session_id: str, file: UploadFile):
    """C8 fallback (TRD §9): a pre-recorded WAV takes the same path a live
    turn would — one turn row, one batch translate call, same scoring
    endpoint afterwards. No mic permission, no separate code path."""
    db = get_client()
    wav_bytes = await file.read()
    # TODO(pipeline dev): confirm the exact response key against the live
    # Sarvam batch STT response — TRD §3.3 documents the request shape only.
    gloss = await translate_segment(wav_bytes)

    existing = db.table("turn").select("idx").eq("session_id", session_id).order("idx", desc=True).limit(1).execute()
    next_idx = (existing.data[0]["idx"] + 1) if existing.data else 0

    row = (
        db.table("turn")
        .insert(
            {
                "session_id": session_id,
                "idx": next_idx,
                "asr_english_gloss": gloss.get("transcript", ""),
                "asr_original_text": gloss.get("transcript", ""),
            }
        )
        .execute()
    )
    return {"turn_id": row.data[0]["id"] if row.data else None}


@router.get("/sessions/{session_id}/latency")
def get_latency(session_id: str):
    db = get_client()
    turns = db.table("turn").select("*").eq("session_id", session_id).execute()
    return {"session_id": session_id, **session_latency(turns.data)}
