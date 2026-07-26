from fastapi import APIRouter

from app.db import get_client
from app.models import RunHarnessRequest
from app.services.harness_runner import run_harness_batch
from app.services.stats import compute_harness_stats

router = APIRouter(tags=["harness"])


@router.post("/harness/run")
async def run_harness(body: RunHarnessRequest):
    """Batches the seeded harness_pair rows, serial + throttled
    (services/harness_runner.py) — never parallelized, see TRD §3.8."""
    db = get_client()
    query = db.table("harness_pair").select("*")
    pairs = query.execute().data
    if body.profile_labels:
        pairs = [p for p in pairs if p["profile_label"] in body.profile_labels]

    sessions_payload = []
    for pair in pairs:
        for session_id, condition in [
            (pair["english_session_id"], "english"),
            (pair["vernacular_session_id"], "vernacular"),
        ]:
            turns = db.table("turn").select("*").eq("session_id", session_id).order("idx").execute().data
            criteria = db.table("rubric_criterion").select("*").execute().data
            sessions_payload.append(
                {
                    "profile_label": pair["profile_label"],
                    "language_condition": condition,
                    "criteria_json": criteria,
                    "english_gloss_transcript": " ".join(t["asr_english_gloss"] or "" for t in turns),
                    "raw_original_transcript": " ".join(t["asr_original_text"] or "" for t in turns),
                }
            )

    batch_results = await run_harness_batch(sessions_payload)

    updated = []
    for pair in pairs:
        eng = next((r for r in batch_results if r["profile_label"] == pair["profile_label"] and r["language_condition"] == "english"), None)
        ver = next((r for r in batch_results if r["profile_label"] == pair["profile_label"] and r["language_condition"] == "vernacular"), None)
        if eng is None or ver is None:
            # One session in the pair produced no result (e.g. zero turns) —
            # skip this pair rather than 500ing the whole batch and losing
            # every other pair's already-saved results (PRD: never cut the
            # harness for one bad profile).
            updated.append({**pair, "error": "missing english or vernacular result for this profile"})
            continue

        eng_scores = {name: agg.score for name, agg in eng["aggregated"].items()}
        ver_scores = {name: agg.score for name, agg in ver["aggregated"].items()}

        stats = compute_harness_stats(
            english_scores=eng_scores,
            vernacular_scores=ver_scores,
            english_fluency=eng["fluency"].get("english_fluency", 0),
            vernacular_fluency=ver["fluency"].get("english_fluency", 0),
            english_raw_runs=eng["raw_runs"],
            vernacular_raw_runs=ver["raw_runs"],
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
                }
            )
            .eq("id", pair["id"])
            .execute()
        )
        updated.append(row.data[0] if row.data else pair)

    return updated


@router.get("/harness/results")
def get_harness_results():
    db = get_client()
    return db.table("harness_pair").select("*").execute().data
