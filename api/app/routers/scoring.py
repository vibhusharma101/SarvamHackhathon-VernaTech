from fastapi import APIRouter, HTTPException

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
async def rescore_session(session_id: str):
    """Same as /score but explicit about intent: creates a new scoring_pass,
    flips the previous one's is_current, history stays intact (TRD §5)."""
    db = get_client()
    try:
        scoring_pass_id = await run_scoring_pass(db, session_id)
    except ScoringError as e:
        raise HTTPException(status_code=404 if "not found" in str(e) else 400, detail=str(e))
    return {"scoring_pass_id": scoring_pass_id}
