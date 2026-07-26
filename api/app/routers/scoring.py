import json

from fastapi import APIRouter, HTTPException

from app.db import get_client
from app.services.aggregate import RunResult, aggregate
from app.services.sarvam_llm import score_criteria, score_fluency

router = APIRouter(tags=["scoring"])


def _fetch_transcripts(db, session_id: str) -> tuple[str, str]:
    turns = (
        db.table("turn")
        .select("*")
        .eq("session_id", session_id)
        .eq("is_clarification", False)
        .order("idx")
        .execute()
    )
    english_gloss = " ".join(t["asr_english_gloss"] or "" for t in turns.data)
    raw_original = " ".join(t["asr_original_text"] or "" for t in turns.data)
    return english_gloss, raw_original


async def _run_scoring_pass(db, session_id: str) -> str:
    session = db.table("session").select("role_id").eq("id", session_id).limit(1).execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="session not found")
    role_id = session.data[0]["role_id"]

    role = db.table("role").select("rubric_id").eq("id", role_id).limit(1).execute()
    if not role.data:
        raise HTTPException(status_code=404, detail="role not found")
    rubric_id = role.data[0]["rubric_id"]

    criteria_rows = db.table("rubric_criterion").select("*").eq("rubric_id", rubric_id).execute()
    criteria_json = json.dumps(criteria_rows.data)

    english_gloss, raw_original = _fetch_transcripts(db, session_id)
    if not english_gloss.strip():
        raise HTTPException(status_code=400, detail="no scored turns yet for this session")

    scoring_pass = db.table("scoring_pass").insert({"session_id": session_id, "is_current": True}).execute()
    scoring_pass_id = scoring_pass.data[0]["id"]
    db.table("scoring_pass").update({"is_current": False}).eq("session_id", session_id).neq(
        "id", scoring_pass_id
    ).execute()

    runs = [await score_criteria(criteria_json, english_gloss) for _ in range(3)]

    criterion_by_name = {c["name"]: c["id"] for c in criteria_rows.data}

    by_criterion: dict[str, list[RunResult]] = {}
    for run_index, run in enumerate(runs, start=1):
        for c in run["criteria"]:
            criterion_id = criterion_by_name.get(c["name"])
            if criterion_id is None:
                # The scorer echoed a name that doesn't match any seeded
                # rubric_criterion — recording it with a null FK would
                # silently orphan the row, so skip and let it show up as a
                # gap in criteria_scored rather than a corrupt row.
                continue

            by_criterion.setdefault(c["name"], []).append(
                RunResult(
                    status=c["status"],
                    score=c.get("score"),
                    evidence_quote_english=c.get("evidence_quote"),
                    reason=c.get("reason"),
                )
            )

            # Raw per-run audit trail (TRD §5 criterion_score) — persisted
            # separately from the aggregated criterion_result below so
            # scorer disagreement stays inspectable, not just averaged away.
            db.table("criterion_score").insert(
                {
                    "scoring_pass_id": scoring_pass_id,
                    "criterion_id": criterion_id,
                    "run_index": run_index,
                    "status": c["status"],
                    "score": c.get("score"),
                    "evidence_quote_english": c.get("evidence_quote"),
                    "reason": c.get("reason"),
                }
            ).execute()

    for name, run_results in by_criterion.items():
        result = aggregate(run_results)
        db.table("criterion_result").insert(
            {
                "scoring_pass_id": scoring_pass_id,
                "criterion_id": criterion_by_name.get(name),
                "status": result.status,
                "score": result.score,
                "evidence_quote_english": result.evidence_quote_english,
                "reason": result.reason,
                "low_consistency": result.low_consistency,
            }
        ).execute()

    fluency = await score_fluency(raw_original)
    db.table("language_proficiency").upsert(
        {
            "session_id": session_id,
            "english_fluency": fluency.get("english_fluency"),
            "disfluency_notes": fluency.get("notes"),
        }
    ).execute()

    return scoring_pass_id


@router.post("/sessions/{session_id}/score")
async def score_session(session_id: str):
    db = get_client()
    scoring_pass_id = await _run_scoring_pass(db, session_id)
    return {"scoring_pass_id": scoring_pass_id}


@router.post("/sessions/{session_id}/rescore")
async def rescore_session(session_id: str):
    """Same as /score but explicit about intent: creates a new scoring_pass,
    flips the previous one's is_current, history stays intact (TRD §5)."""
    db = get_client()
    scoring_pass_id = await _run_scoring_pass(db, session_id)
    return {"scoring_pass_id": scoring_pass_id}
