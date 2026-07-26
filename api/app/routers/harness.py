"""Fairness harness — compares an English-condition session against a
vernacular-condition session carrying the same engineering content, and
reports whether the competence score moved (TRD §7).

Reads the *stored* scoring results rather than re-scoring. Every session is
already scored when its interview completes (app/routers/interview.py), so
re-running 3 scoring passes per session here would burn ~24 LLM calls against
a ~60/min account ceiling to recompute numbers already sitting in Postgres.
Sessions that have never been scored are scored once, serially and throttled
per TRD §3.8.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException

from app.db import get_client
from app.models import CreateHarnessPairRequest, RunHarnessRequest
from app.services.scoring_service import run_scoring_pass
from app.services.stats import compute_harness_stats, noise_verdict

logger = logging.getLogger(__name__)

router = APIRouter(tags=["harness"])

THROTTLE_SECONDS = 1.2  # TRD §3.8 — never parallelize this.


@router.post("/harness/pairs")
def create_harness_pair(body: CreateHarnessPairRequest):
    """Links two existing sessions as one paired profile. The two sessions
    must carry the *same engineering content* in different languages — that
    equivalence is the operator's claim, not something the API can verify,
    and the whole comparison is meaningless without it."""
    db = get_client()

    for session_id in (body.english_session_id, body.vernacular_session_id):
        found = db.table("session").select("id").eq("id", session_id).limit(1).execute()
        if not found.data:
            raise HTTPException(status_code=404, detail=f"session {session_id} not found")

    if body.english_session_id == body.vernacular_session_id:
        raise HTTPException(status_code=400, detail="a pair needs two different sessions")

    row = (
        db.table("harness_pair")
        .upsert(
            {
                "profile_label": body.profile_label,
                "english_session_id": body.english_session_id,
                "vernacular_session_id": body.vernacular_session_id,
            },
            on_conflict="profile_label",
        )
        .execute()
    )
    return row.data[0] if row.data else None


def _current_pass_id(db, session_id: str) -> str | None:
    passes = (
        db.table("scoring_pass")
        .select("id, criterion_result(criterion_id)")
        .eq("session_id", session_id)
        .eq("is_current", True)
        .limit(1)
        .execute()
    )
    # A pass row with no results is a leftover from a failed run, not a
    # scored session — treat it as unscored so it gets redone.
    if passes.data and passes.data[0].get("criterion_result"):
        return passes.data[0]["id"]
    return None


def _stored_scores(db, scoring_pass_id: str) -> tuple[dict[str, float | None], dict[str, list[int]]]:
    """Aggregated score per criterion, plus the raw per-run scores behind it.
    Keyed by criterion_id — stable, unlike the criterion names the scorer
    echoes back."""
    results = (
        db.table("criterion_result")
        .select("criterion_id, status, score")
        .eq("scoring_pass_id", scoring_pass_id)
        .execute()
    )
    aggregated = {
        r["criterion_id"]: (r["score"] if r["status"] == "scored" else None) for r in results.data
    }

    raw = (
        db.table("criterion_score")
        .select("criterion_id, score, status")
        .eq("scoring_pass_id", scoring_pass_id)
        .execute()
    )
    raw_runs: dict[str, list[int]] = {}
    for r in raw.data:
        if r["status"] == "scored" and r["score"] is not None:
            raw_runs.setdefault(r["criterion_id"], []).append(r["score"])

    return aggregated, raw_runs


def _fluency(db, session_id: str) -> int | None:
    row = (
        db.table("language_proficiency")
        .select("english_fluency")
        .eq("session_id", session_id)
        .limit(1)
        .execute()
    )
    return row.data[0]["english_fluency"] if row.data else None


async def _ensure_scored(db, session_id: str) -> str | None:
    pass_id = _current_pass_id(db, session_id)
    if pass_id:
        return pass_id
    await asyncio.sleep(THROTTLE_SECONDS)
    try:
        return await run_scoring_pass(db, session_id)
    except Exception:
        logger.exception("harness could not score session %s", session_id)
        return None


@router.post("/harness/run")
async def run_harness(body: RunHarnessRequest):
    db = get_client()
    pairs = db.table("harness_pair").select("*").execute().data
    if body.profile_labels:
        pairs = [p for p in pairs if p["profile_label"] in body.profile_labels]
    if not pairs:
        return []

    updated = []
    for pair in pairs:
        eng_session = pair["english_session_id"]
        ver_session = pair["vernacular_session_id"]

        eng_pass = await _ensure_scored(db, eng_session)
        ver_pass = await _ensure_scored(db, ver_session)
        if not eng_pass or not ver_pass:
            # One side unscorable (no turns, LLM failure) — skip this pair
            # rather than fail the batch and lose the others (PRD: never cut
            # the harness for one bad profile).
            updated.append({**pair, "error": "one or both sessions could not be scored"})
            continue

        eng_scores, eng_raw = _stored_scores(db, eng_pass)
        ver_scores, ver_raw = _stored_scores(db, ver_pass)

        stats = compute_harness_stats(
            english_scores=eng_scores,
            vernacular_scores=ver_scores,
            english_fluency=_fluency(db, eng_session),
            vernacular_fluency=_fluency(db, ver_session),
            english_raw_runs=eng_raw,
            vernacular_raw_runs=ver_raw,
        )

        row = (
            db.table("harness_pair")
            .update(
                {
                    "competence_mad": stats.competence_mad,
                    "max_observed_gap": stats.max_observed_gap,
                    "proficiency_delta": stats.proficiency_delta,
                    "english_run_variance": stats.english_run_variance,
                    "vernacular_run_variance": stats.vernacular_run_variance,
                    "excluded_criteria_count": stats.excluded_criteria_count,
                }
            )
            .eq("id", pair["id"])
            .execute()
        )
        result = row.data[0] if row.data else pair
        updated.append({**result, "noise_verdict": noise_verdict(stats)})

    return updated


@router.get("/harness/results")
def get_harness_results():
    db = get_client()
    return (
        db.table("harness_pair")
        .select("*")
        .order("profile_label")
        .execute()
        .data
    )
