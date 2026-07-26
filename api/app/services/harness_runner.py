"""Harness batch runner — serial, throttled (TRD §3.8). Six sessions fired in
a tight loop bursts past the ~60 req/min per-account ceiling and returns 429s
mid-run; this file exists specifically so nobody "optimizes" that loop back
into a parallel one at Hour 4.
"""

import asyncio

import httpx

from app.services.sarvam_llm import score_criteria, score_fluency
from app.services.aggregate import RunResult, aggregate

THROTTLE_SECONDS = 1.2
RETRY_BACKOFF_SECONDS = 30


async def _throttled_call(coro_fn, *args, **kwargs):
    await asyncio.sleep(THROTTLE_SECONDS)
    try:
        return await coro_fn(*args, **kwargs)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            await asyncio.sleep(RETRY_BACKOFF_SECONDS)
            return await coro_fn(*args, **kwargs)
        raise


async def score_session(criteria_json: str, english_gloss_transcript: str, raw_original_transcript: str):
    """3 self-consistency runs per session, serial + throttled, then one
    fluency call. Returns (aggregated_per_criterion, raw_runs_per_criterion,
    fluency_result)."""
    run_results: list[dict] = []
    for _ in range(3):
        run_results.append(await _throttled_call(score_criteria, criteria_json, english_gloss_transcript))

    by_criterion: dict[str, list[RunResult]] = {}
    for run in run_results:
        for c in run["criteria"]:
            by_criterion.setdefault(c["name"], []).append(
                RunResult(
                    status=c["status"],
                    score=c.get("score"),
                    evidence_quote_original=None,  # filled in by caller from the original-language turn text
                    evidence_quote_english=c.get("evidence_quote"),
                    reason=c.get("reason"),
                )
            )

    aggregated = {name: aggregate(runs) for name, runs in by_criterion.items()}
    raw_runs = {name: [r.score for r in runs if r.score is not None] for name, runs in by_criterion.items()}

    fluency = await _throttled_call(score_fluency, raw_original_transcript)

    return aggregated, raw_runs, fluency


async def run_harness_batch(sessions: list[dict]) -> list[dict]:
    """sessions: list of {criteria_json, english_gloss_transcript,
    raw_original_transcript, profile_label, language_condition}. Processed
    strictly in order — see module docstring for why this is not a
    gather()."""
    results = []
    for session in sessions:
        aggregated, raw_runs, fluency = await score_session(
            session["criteria_json"],
            session["english_gloss_transcript"],
            session["raw_original_transcript"],
        )
        results.append(
            {
                "profile_label": session["profile_label"],
                "language_condition": session["language_condition"],
                "aggregated": aggregated,
                "raw_runs": raw_runs,
                "fluency": fluency,
            }
        )
    return results
