from fastapi import APIRouter, Body, HTTPException

from app.db import get_client
from app.services.scoring_service import ScoringError, run_scoring_pass

router = APIRouter(tags=["scoring"])


@router.post("/sessions/{session_id}/score")
async def score_session(session_id: str):
    db = get_client()
    try:
        scoring_pass_id = await run_scoring_pass(db, session_id)
    except ScoringError as e:
        raise HTTPException(status_code=404 if "not found" in str(e) else 400, detail=str(e))
    return {"scoring_pass_id": scoring_pass_id}


@router.post("/sessions/{session_id}/rescore")
async def rescore_session(session_id: str, body: dict = Body(default={})):
    """Same as /score but explicit about intent: creates a new scoring_pass,
    flips the previous one's is_current, history stays intact (TRD §5).

    `notes` is {criterion_id: note}, tagged to specific criteria — persisted
    into criterion_note BEFORE scoring runs, so run_scoring_pass (which
    always reads the session's current notes) picks them up immediately and
    injects each one into that exact criterion's own prompt context. This is
    the "memory" behavior: a note outlives this one call and is reused on
    every future rescore too, linked to the criterion it was written for.
    """
    db = get_client()
    notes = body.get("notes") or {}
    for criterion_id, note in notes.items():
        db.table("criterion_note").upsert(
            {"session_id": session_id, "criterion_id": criterion_id, "note": note},
            on_conflict="session_id,criterion_id",
        ).execute()
    try:
        scoring_pass_id = await run_scoring_pass(db, session_id)
    except ScoringError as e:
        raise HTTPException(status_code=404 if "not found" in str(e) else 400, detail=str(e))
    return {"scoring_pass_id": scoring_pass_id}
