"""Shared scoring-pass logic — used by both the HTTP score/rescore endpoints
(app/routers/scoring.py) and the fixed-question interview WS flow
(app/routers/interview.py). One implementation, not duplicated, since both
callers need the exact same 3-run aggregate + fluency + persistence.

Raises plain ScoringError rather than HTTPException — this is a service
function shared by an HTTP router and a WS router, and only the HTTP router
can meaningfully translate an error into a status code.

Ordering matters: every LLM call happens BEFORE the first DB write. An
earlier version created the `scoring_pass` row up front and a mid-run LLM
failure left an orphaned pass with zero results — which then looked
"already scored" to the interview resume check and could never be retried.
Found live, not hypothetically. Do not reorder these two phases.
"""

import json

from app.services.aggregate import RunResult, aggregate
from app.services.sarvam_llm import score_criteria, score_fluency


class ScoringError(Exception):
    pass


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


async def run_scoring_pass(db, session_id: str) -> str:
    # ---- Phase 1: read inputs and do every fallible LLM call. No writes. ----

    session = db.table("session").select("role_id").eq("id", session_id).limit(1).execute()
    if not session.data:
        raise ScoringError("session not found")
    role_id = session.data[0]["role_id"]

    role = db.table("role").select("rubric_id").eq("id", role_id).limit(1).execute()
    if not role.data:
        raise ScoringError("role not found")
    rubric_id = role.data[0]["rubric_id"]

    criteria_rows = db.table("rubric_criterion").select("*").eq("rubric_id", rubric_id).execute()
    if not criteria_rows.data:
        raise ScoringError(f"no rubric criteria seeded for rubric {rubric_id}")
    criteria_json = json.dumps(criteria_rows.data)

    english_gloss, raw_original = _fetch_transcripts(db, session_id)
    if not english_gloss.strip():
        raise ScoringError("no scored turns yet for this session")

    runs = [await score_criteria(criteria_json, english_gloss) for _ in range(3)]
    fluency = await score_fluency(raw_original)

    criterion_by_name = {c["name"]: c["id"] for c in criteria_rows.data}

    # Collate in memory, still before any write, so a scorer that echoes
    # unrecognized criterion names surfaces as an explicit error rather than
    # a silently empty scorecard.
    by_criterion: dict[str, list[RunResult]] = {}
    unmatched: set[str] = set()
    for run in runs:
        for c in run.get("criteria", []):
            name = c.get("name")
            if name not in criterion_by_name:
                unmatched.add(str(name))
                continue
            by_criterion.setdefault(name, []).append(
                RunResult(
                    status=c["status"],
                    score=c.get("score"),
                    evidence_quote_english=c.get("evidence_quote"),
                    reason=c.get("reason"),
                )
            )

    if not by_criterion:
        raise ScoringError(
            "scorer returned no criteria matching the seeded rubric"
            + (f" (unmatched names: {sorted(unmatched)})" if unmatched else "")
        )

    # ---- Phase 2: everything above succeeded — now persist. ----

    scoring_pass = db.table("scoring_pass").insert({"session_id": session_id, "is_current": True}).execute()
    scoring_pass_id = scoring_pass.data[0]["id"]
    db.table("scoring_pass").update({"is_current": False}).eq("session_id", session_id).neq(
        "id", scoring_pass_id
    ).execute()

    # Raw per-run audit trail (TRD §5 criterion_score) — persisted separately
    # from the aggregated criterion_result below so scorer disagreement stays
    # inspectable, not just averaged away.
    raw_rows = []
    for run_index, run in enumerate(runs, start=1):
        for c in run.get("criteria", []):
            criterion_id = criterion_by_name.get(c.get("name"))
            if criterion_id is None:
                continue
            raw_rows.append(
                {
                    "scoring_pass_id": scoring_pass_id,
                    "criterion_id": criterion_id,
                    "run_index": run_index,
                    "status": c["status"],
                    "score": c.get("score"),
                    "evidence_quote_english": c.get("evidence_quote"),
                    "reason": c.get("reason"),
                }
            )
    if raw_rows:
        db.table("criterion_score").insert(raw_rows).execute()

    result_rows = []
    for name, run_results in by_criterion.items():
        result = aggregate(run_results)
        result_rows.append(
            {
                "scoring_pass_id": scoring_pass_id,
                "criterion_id": criterion_by_name[name],
                "status": result.status,
                "score": result.score,
                "evidence_quote_english": result.evidence_quote_english,
                "reason": result.reason,
                "low_consistency": result.low_consistency,
            }
        )
    db.table("criterion_result").insert(result_rows).execute()

    db.table("language_proficiency").upsert(
        {
            "session_id": session_id,
            "english_fluency": fluency.get("english_fluency"),
            "disfluency_notes": fluency.get("notes"),
        }
    ).execute()

    return scoring_pass_id
