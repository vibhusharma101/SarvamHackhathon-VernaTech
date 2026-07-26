import httpx
from fastapi import APIRouter, HTTPException

from app.config import BEECEPTOR_URL, SLACK_WEBHOOK_URL
from app.db import get_client

router = APIRouter(tags=["writeback"])


def _build_ats_payload(session: dict, candidate: dict, role: dict, scorecard: dict, proficiency: dict | None) -> dict:
    """Shape matches PRD Appendix exactly — refusals carry null, not 0;
    proficiency is excluded and labelled as such; scorer provenance travels
    with the record."""
    scored = [c for c in scorecard["criteria"] if c["status"] == "scored"]
    return {
        "candidate_id": candidate["id"],
        "role": role["title"],
        "screen_language": session["spoken_language"],
        "recommendation": "advance_to_hiring_manager" if scored else "insufficient_evidence",
        "competence": {
            "overall": scorecard["overall"],
            "scale_max": 5,
            "criteria_scored": scorecard["criteria_scored"],
            "criteria_insufficient": scorecard["criteria_insufficient"],
            "criteria": [
                {
                    "name": c["rubric_criterion"]["name"] if c.get("rubric_criterion") else c.get("criterion_id"),
                    "status": c["status"],
                    "score": c["score"],
                    "evidence_original": c.get("evidence_quote_original"),
                    "evidence_english": c.get("evidence_quote_english"),
                    "reason": c.get("reason"),
                }
                for c in scorecard["criteria"]
            ],
        },
        "language_proficiency": {
            "english_fluency": proficiency["english_fluency"] if proficiency else None,
            "scale_max": 5,
            "note": "Recorded separately. NOT an input to competence scoring.",
        },
        "audit": {
            "session_id": session["id"],
            "scorer_model": "sarvam-30b",
            "scorer_temperature": 0.1,
            "runs_per_criterion": 3,
            "consent_ts": candidate.get("consent_ts"),
        },
    }


@router.post("/sessions/{session_id}/writeback")
async def writeback(session_id: str):
    db = get_client()
    session_row = db.table("session").select("*").eq("id", session_id).limit(1).execute()
    if not session_row.data:
        raise HTTPException(status_code=404, detail="session not found")
    session = session_row.data[0]

    candidate = db.table("candidate").select("*").eq("id", session["candidate_id"]).limit(1).execute().data[0]
    role = db.table("role").select("*").eq("id", session["role_id"]).limit(1).execute().data[0]

    from app.routers.sessions import get_scorecard  # local import avoids a circular import at module load

    scorecard = get_scorecard(session_id)
    proficiency = scorecard.get("language_proficiency")

    payload = _build_ats_payload(session, candidate, role, scorecard, proficiency)

    async with httpx.AsyncClient(timeout=15) as client:
        beeceptor_resp = await client.post(BEECEPTOR_URL, json=payload)
        slack_status = None
        if SLACK_WEBHOOK_URL:
            slack_resp = await client.post(SLACK_WEBHOOK_URL, json={"text": f"Scorecard posted for {candidate['name']}"})
            slack_status = slack_resp.status_code

    return {"beeceptor_status": beeceptor_resp.status_code, "slack_status": slack_status, "payload": payload}
