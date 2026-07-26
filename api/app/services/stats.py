"""Harness statistics — exact formulas from TRD §7. These numbers go on stage;
do not approximate them."""

from dataclasses import dataclass
from statistics import variance


@dataclass
class HarnessStats:
    competence_mad: float | None
    max_observed_gap: float | None
    excluded_criteria_count: int
    proficiency_delta: float | None
    english_run_variance: float
    vernacular_run_variance: float


def compute_harness_stats(
    english_scores: dict[str, float | None],  # criterion_id -> aggregated score (None if insufficient)
    vernacular_scores: dict[str, float | None],
    english_fluency: int | None,
    vernacular_fluency: int | None,
    english_raw_runs: dict[str, list[int]],  # criterion_id -> the 3 raw run scores
    vernacular_raw_runs: dict[str, list[int]],
) -> HarnessStats:
    common = set(english_scores) & set(vernacular_scores)
    # Rule 1: criteria refused (None) in either condition are excluded from MAD.
    diffable = [c for c in common if english_scores[c] is not None and vernacular_scores[c] is not None]
    excluded = len(common) - len(diffable)

    if diffable:
        diffs = [abs(english_scores[c] - vernacular_scores[c]) for c in diffable]
        competence_mad = sum(diffs) / len(diffs)
        max_observed_gap = max(diffs)  # Rule 2: per-criterion, not on the overall mean.
    else:
        competence_mad = None
        max_observed_gap = None

    def avg_variance(raw_runs: dict[str, list[int]]) -> float:
        per_criterion = [variance(runs) for runs in raw_runs.values() if len(runs) >= 2]
        return sum(per_criterion) / len(per_criterion) if per_criterion else 0.0

    # A missing fluency score means the candidate produced no English to
    # rate in that condition (see sarvam_llm.score_fluency). Differencing
    # against a fabricated 0 would report a large, entirely invented
    # proficiency gap — exactly the kind of number this project exists to
    # not put on a slide. None means "not measurable", and says so.
    proficiency_delta = (
        english_fluency - vernacular_fluency
        if english_fluency is not None and vernacular_fluency is not None
        else None
    )

    return HarnessStats(
        competence_mad=competence_mad,
        max_observed_gap=max_observed_gap,
        excluded_criteria_count=excluded,
        proficiency_delta=proficiency_delta,
        english_run_variance=avg_variance(english_raw_runs),
        vernacular_run_variance=avg_variance(vernacular_raw_runs),
    )


def noise_verdict(stats: HarnessStats) -> str:
    """Rule 3: compare competence_mad against run_variance."""
    if stats.competence_mad is None:
        return "no comparable criteria"
    pooled_variance = (stats.english_run_variance + stats.vernacular_run_variance) / 2
    if stats.competence_mad <= pooled_variance:
        return "language difference is within scorer noise"
    return "language difference exceeds scorer noise — disclose plainly"
