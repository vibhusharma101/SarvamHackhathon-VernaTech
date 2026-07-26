"""Self-consistency aggregation across the 3 scoring runs for one criterion.
Formula is TRD §3.4 — implemented verbatim, do not re-derive."""

from dataclasses import dataclass
from math import ceil
from typing import Literal


@dataclass
class RunResult:
    status: Literal["scored", "insufficient_evidence"]
    score: int | None = None
    evidence_quote_original: str | None = None
    evidence_quote_english: str | None = None
    reason: str | None = None


@dataclass
class AggregatedResult:
    status: Literal["scored", "insufficient_evidence"]
    score: int | None
    low_consistency: bool
    evidence_quote_original: str | None = None
    evidence_quote_english: str | None = None
    reason: str | None = None


def aggregate(runs: list[RunResult]) -> AggregatedResult:
    scored = [r for r in runs if r.status == "scored"]

    if len(scored) < 2:  # majority insufficient
        reason = next((r.reason for r in runs if r.reason), None)
        return AggregatedResult(
            status="insufficient_evidence",
            score=None,
            low_consistency=len(scored) == 1,
            reason=reason,
        )

    vals = sorted(r.score for r in scored)
    if len(vals) % 2:
        median = vals[len(vals) // 2]
    else:
        median = ceil((vals[0] + vals[1]) / 2)

    median_run = min(scored, key=lambda r: abs(r.score - median))
    low_consistency = (max(vals) - min(vals)) >= 2 or len(scored) == 2

    return AggregatedResult(
        status="scored",
        score=median,
        low_consistency=low_consistency,
        evidence_quote_original=median_run.evidence_quote_original,
        evidence_quote_english=median_run.evidence_quote_english,
    )
