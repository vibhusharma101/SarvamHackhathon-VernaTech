"""Scoring accuracy eval. Run: ./venv/bin/python evals/score_eval.py

Labeled cases are REAL ASR output pulled from the live DB (mangled technical
terms and all) plus the clean demo-script answers — not idealized text, so the
numbers here reflect what actually happens on stage.

Labels encode three failures traced by hand against live data:
  F1  fabricated credit: a genuine non-answer to the trade-off question still
      scored 4, because all 4 turns are concatenated and the scorer found
      trade-off-ish content in an earlier turn.
  F2  translation-loss: the Hindi Data-modelling answer names MORE than the
      English one (schema + rejected alternative) but was marked
      insufficient_evidence because the English gloss came back garbled.
  F3  cross-language drift: P1's EN and HI answers are content-equivalent
      (HI arguably thinner) yet HI scored a flat +1 on every criterion.
"""

import argparse
import asyncio
import json
import os
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.aggregate import RunResult, aggregate  # noqa: E402
from app.services.sarvam_llm import score_criteria  # noqa: E402
from app.services.term_correction import correct_technical_terms  # noqa: E402

CRITERIA = [
    {
        "name": "Production debugging",
        "definition": "Diagnosed a real failure in a running system.",
        "evidence_required": "a specific symptom, the diagnostic method used, and the fix.",
        "anchor_l1": 'generic ("we fixed bugs")',
        "anchor_l2": "names a bug, no method",
        "anchor_l3": "symptom + method",
        "anchor_l4": "symptom + method + fix, specific and coherent",
        "anchor_l5": "all of that plus what they'd do differently or how they prevented recurrence",
    },
    {
        "name": "Data modelling",
        "definition": "Made a schema or data-structure decision and can justify it.",
        "evidence_required": "the shape chosen, and why over an alternative.",
        "anchor_l1": "names a database only",
        "anchor_l2": "describes a schema, no reasoning",
        "anchor_l3": "schema + one reason",
        "anchor_l4": "schema + reasoning + rejected alternative",
        "anchor_l5": "all that plus how it behaved under real load or change",
    },
    {
        "name": "Concurrency / scale behaviour",
        "definition": "Handled concurrent load, race conditions, caching, or queueing.",
        "evidence_required": "a concrete instance with the mechanism named.",
        "anchor_l1": "buzzwords only",
        "anchor_l2": "names a mechanism, no instance",
        "anchor_l3": "mechanism + instance",
        "anchor_l4": "mechanism + instance + why that mechanism",
        "anchor_l5": "plus failure modes or trade-offs of the choice",
    },
    {
        "name": "Trade-off articulation",
        "definition": "Chose one path and can explain what was given up.",
        "evidence_required": "decision, alternative, cost accepted.",
        "anchor_l1": "no trade-off framing",
        "anchor_l2": "asserts a decision",
        "anchor_l3": "decision + alternative",
        "anchor_l4": "decision + alternative + cost accepted",
        "anchor_l5": "plus what would change the decision",
    },
]

CRITERION_ORDER = [c["name"] for c in CRITERIA]

# Real ASR output from the live DB. turns[i] answers CRITERION_ORDER[i].
SESSIONS = {
    "Test-EN": [
        "We had a production issue where APL latency spiked and the server scratched with Chrome errors. I took a heap of using JVM tools and analyzed it. I found we were holding large objects in memory during a batch export. I fixed it by streaming the data in chunks instead of loading it all into memory.",
        "For our analytics dashboard, the primary events table grew too fast, causing slow read queries. We considered moving to a NoSQL, NoSQL database like MongoDB for faster writes, but it needed strict asset consistency for billing, and I rejected it.",
        "During a major flash sale, a product catalog service had a massive traffic spike. Overloading the primary database to handle the concurrent load, I implemented a Redis cache layer for frequently accessed products. This immediately dropped the database read load.",
        "Yeah, so we run into concurrency issues sometimes. I don't take care of that. The code was struggling and I was worried, so I worked with the team to fix it. And I don't think so this is a problem.",
    ],
    "Test-HI": [
        "Once, the API latency in the production app was very spiked. Because servers were crashing a lot due to errors.",
        "Our analytics dashboard's primary events table was growing very fast. Because of this, read queries had become very slow. Earlier, we thought of using a NoSQL like MongoDB for fast writes, but then we needed strict acid for billing. So, we dropped that consistency, rejected it, and kept it as post. But date-based partitioning was implemented, consistency from this trade-off.",
        "During a flash sale, our product catalog service experienced a very massive spike in traffic, which overloaded the primary database. To reduce this current load, I frequently applied a layer of Redis in front of access products.",
        "Yes, I don't see that issue with Konkan. That used to happen, what's the big deal? The load on the board kept increasing. We fixed to meet him with the team, but I didn't.",
    ],
    "P1-EN": [
        "They had a memory leak in production. It took a heat dump, found a growing catch, and fixed it by adding an eviction policy.",
        "He designed a partition table by customer region because most queries filtered on region, and he rejected a single large table because it would not scale on right.",
        "They used a latest based sliding window rate limiter to handle concurrent requests because it was simple and gave predictable behavior under load.",
        "It chose eventual consistency over strong consistency for the notification service. The cost was occasional delayed delivery, but it kept latency low.",
    ],
    "P1-HI": [
        "There was a memory leak in our production system. I took a heap dump, found increasing cash, and fixed it by applying an eviction policy.",
        "I designed the partition table according to the customer region because most queries used to filter on the region.",
        "We used A-Disk's sliding window rate limiter to handle concurrent requests because it was simple and gave predictable behavior in the load.",
        "I chose eventual consistency instead of strong consistency for the notification service. Its price was that the delivery was sometimes late, but the latency was low.",
    ],
}

# Expected per criterion. None => insufficient_evidence. A tuple => acceptable
# inclusive range (genuine judgment calls where one exact integer is unfair).
EXPECTED = {
    # F1: turn 3 is an explicit non-answer -> must NOT be credited.
    "Test-EN": {
        "Production debugging": (4, 5),
        "Data modelling": (2, 3),  # names rejected alt, never names chosen schema
        "Concurrency / scale behaviour": (3, 4),
        "Trade-off articulation": None,
    },
    # F2: Data modelling names schema AND rejected alternative -> must score.
    "Test-HI": {
        "Production debugging": (1, 2),  # symptom only, no method, no fix
        "Data modelling": (3, 4),
        "Concurrency / scale behaviour": (3, 4),
        "Trade-off articulation": None,
    },
    # F3: these two must land on the SAME score per criterion (checked
    # separately as cross-language drift, not just absolute correctness).
    "P1-EN": {
        "Production debugging": (3, 4),
        "Data modelling": (3, 4),
        "Concurrency / scale behaviour": (3, 4),
        "Trade-off articulation": (3, 4),
    },
    "P1-HI": {
        "Production debugging": (3, 4),
        "Data modelling": (2, 3),  # drops the rejected-alternative clause
        "Concurrency / scale behaviour": (3, 4),
        "Trade-off articulation": (3, 4),
    },
}

DRIFT_PAIRS = [("P1-EN", "P1-HI"), ("Test-EN", "Test-HI")]


def _ok(actual_status, actual_score, expected) -> bool:
    if expected is None:
        return actual_status == "insufficient_evidence"
    if actual_status != "scored" or actual_score is None:
        return False
    lo, hi = expected
    return lo <= actual_score <= hi


async def score_session(turns: list[str], runs: int, per_question: bool, correct: bool = False) -> dict:
    """Returns {criterion_name: AggregatedResult}."""
    if correct:
        turns = list(await asyncio.gather(*(correct_technical_terms(t) for t in turns)))
    if per_question:
        transcript = "\n\n".join(
            f"--- ANSWER TO THE QUESTION FOR CRITERION: {CRITERION_ORDER[i]} ---\n{t}"
            for i, t in enumerate(turns)
        )
    else:
        transcript = " ".join(turns)

    criteria_json = json.dumps(CRITERIA)
    all_runs = [await score_criteria(criteria_json, transcript) for _ in range(runs)]

    by_criterion: dict[str, list[RunResult]] = {}
    for run in all_runs:
        for c in run.get("criteria", []):
            name = c.get("name")
            if name not in CRITERION_ORDER:
                continue
            status, score = c.get("status"), c.get("score")
            if status not in ("scored", "insufficient_evidence"):
                status = "scored" if isinstance(score, int) and 1 <= score <= 5 else "insufficient_evidence"
            by_criterion.setdefault(name, []).append(
                RunResult(status=status, score=score if status == "scored" else None, reason=c.get("reason"))
            )
    return {name: aggregate(rs) for name, rs in by_criterion.items()}


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--per-question", action="store_true", help="gate evidence to the turn that answers each criterion")
    ap.add_argument("--correct", action="store_true", help="repair ASR-mangled technical terms first")
    args = ap.parse_args()

    results = {}
    for label, turns in SESSIONS.items():
        results[label] = await score_session(turns, args.runs, args.per_question, args.correct)

    correct = total = 0
    print(f"\n{'=' * 78}")
    mode = "per-question gated" if args.per_question else "flat concatenation (baseline)"
    print(f"MODE: {mode}{' + term-correction' if args.correct else ''}  runs={args.runs}")
    print("=" * 78)

    for label, per_criterion in results.items():
        print(f"\n{label}")
        for name in CRITERION_ORDER:
            agg = per_criterion.get(name)
            expected = EXPECTED[label][name]
            status = agg.status if agg else "MISSING"
            score = agg.score if agg else None
            passed = _ok(status, score, expected)
            correct += passed
            total += 1
            exp_str = "insufficient" if expected is None else f"{expected[0]}-{expected[1]}"
            got_str = "insufficient" if status == "insufficient_evidence" else str(score)
            print(f"  [{'PASS' if passed else 'FAIL'}] {name:<32} expected={exp_str:<12} got={got_str}")

    print(f"\n{'-' * 78}")
    print(f"CRITERION ACCURACY: {correct}/{total} = {100 * correct / total:.1f}%")

    drifts = []
    for en_label, hi_label in DRIFT_PAIRS:
        for name in CRITERION_ORDER:
            a, b = results[en_label].get(name), results[hi_label].get(name)
            if a and b and a.score is not None and b.score is not None:
                drifts.append(abs(a.score - b.score))
    if drifts:
        print(f"CROSS-LANGUAGE DRIFT: mean={statistics.mean(drifts):.2f}  max={max(drifts)}  (target: mean<0.5, max<=1)")
    print("-" * 78)


if __name__ == "__main__":
    asyncio.run(main())
