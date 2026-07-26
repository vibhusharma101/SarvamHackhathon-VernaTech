"""Verdict layer: Speech -> Text -> Intent -> Verdict (PRD: verdict-layer).
Consumes the {category, english_text} already produced by
sarvam_intent.extract_intent — does not redo STT or intent extraction.

Deliberately hacky per explicit instruction, tuned to work for a fixed set
of demo answers rather than built as a general product:
- No RubricFeature/CategoryVerdict/SessionVerdict tables — the 16 features
  are fixed and not user-editable, so they're a Python constant. Verdict
  data rides inside intent_turn as one more jsonb column.
- No Turn 0-5 conversational orchestration (intro turn, adaptive
  follow-up) — that needs an agent that asks questions in sequence, a
  different system than this push-to-talk architecture. Instead, each
  turn's already-auto-detected category (from extract_intent) selects
  which 4 features to check, and session verdict is recomputed from
  every persisted turn each time (latest result per category wins, so a
  retry naturally supersedes an earlier weak answer in the same category).
"""

import json

from sarvamai import AsyncSarvamAI

from app.config import SARVAM_API_KEY

_client = AsyncSarvamAI(api_subscription_key=SARVAM_API_KEY)


class VerdictError(Exception):
    pass


# Same structure across categories on purpose (PRD §5) — uniform prompt and
# data model, and it's obvious when a category is thin (fewer `yes`) versus
# under-asked (more `not_addressed`).
RUBRIC_FEATURES: dict[str, list[dict[str, str]]] = {
    "Debugging & Diagnosis": [
        {"id": "symptom", "name": "Names a specific symptom or failure",
         "definition": "A concrete symptom or failure mode is named (e.g. latency spike, OOM crash)."},
        {"id": "method", "name": "Describes a diagnostic method or steps taken",
         "definition": "A specific diagnostic method or investigation step is described (e.g. heap dump, logs, profiler)."},
        {"id": "fix", "name": "Names the fix applied",
         "definition": "The concrete fix that resolved the issue is named."},
        {"id": "root_cause", "name": "Explains root cause or how recurrence was prevented",
         "definition": "The underlying root cause is explained, or a step taken to prevent recurrence is named."},
    ],
    "System / Data Design": [
        {"id": "schema", "name": "Names the schema/structure chosen",
         "definition": "A specific schema, data structure, or architecture is named."},
        {"id": "reason", "name": "States a reason for that choice",
         "definition": "A concrete reason is given for why that structure was chosen."},
        {"id": "alternative", "name": "Names an alternative that was rejected",
         "definition": "A specific alternative approach that was considered and rejected is named."},
        {"id": "behavior", "name": "Describes how it behaved under real load or change",
         "definition": "How the chosen design performed under real load, growth, or change is described."},
    ],
    "Scale & Concurrency": [
        {"id": "mechanism", "name": "Names a specific mechanism",
         "definition": "A specific mechanism is named (cache, queue, lock, replica, etc.)."},
        {"id": "instance", "name": "Gives a concrete instance where it was used",
         "definition": "A concrete real situation where the mechanism was applied is described."},
        {"id": "why_this", "name": "Explains why that mechanism over another",
         "definition": "A reason is given for choosing that mechanism over an alternative."},
        {"id": "tradeoff", "name": "Names a failure mode or trade-off of the choice",
         "definition": "A failure mode, limitation, or trade-off of the chosen mechanism is named."},
    ],
    "Trade-off Reasoning": [
        {"id": "decision", "name": "States a decision that was made",
         "definition": "A specific decision that was made is stated."},
        {"id": "alternative", "name": "Names the alternative that was passed over",
         "definition": "The specific alternative that was not chosen is named."},
        {"id": "cost", "name": "States the cost accepted by choosing as they did",
         "definition": (
             "A consequence the RUNNING SYSTEM or its USERS bear because of the choice — e.g. "
             "'we accepted eventual consistency', 'this adds latency', 'this adds operational "
             "complexity', 'this creates a new failure mode'. COUNTS as yes. "
             "A cost borne by the TEAM instead of the system — e.g. 'we accepted the cost of "
             "learning RabbitMQ', 'it took time to ramp up', 'it was hard to set up' — does NOT "
             "count, even though the word 'cost' is used. If the stated cost is about learning, "
             "effort, or time-to-build rather than something the system now does differently, "
             "mark this 'no', not 'yes'."
         )},
        {"id": "reversal", "name": "States what would change the decision",
         "definition": "A condition or fact that would have changed the decision is stated."},
    ],
}

VERDICT_SYSTEM_PROMPT = """You are evaluating a technical screening answer against a rubric.
You are checking for the PRESENCE OF SPECIFIC CLAIMS, not communication
quality. Do not consider grammar, fluency, hesitation, or how the answer
was phrased — only whether the fact was stated.

CATEGORY: {category}

FEATURES TO CHECK:
{features_json}

TRANSCRIPT (English gloss, this turn):
{english_text}

For each feature, decide:
- "yes" — the claim is present and specific. Quote the exact span.
- "no" — the topic was addressed but the claim is missing, vague, or
  incorrect. Quote what was said, or state that nothing relevant was said.
- "not_addressed" — this was never brought up in this turn.

Return only this JSON, no prose, no markdown fences. "id" must exactly
match the feature ids given above:
{{"features": [{{"id": "<feature id>", "status": "yes"|"no"|"not_addressed", "evidence_quote": "<exact quote>" or null, "reason": "<why this status>", "improvement_note": "<what's missing, or null if status is yes>"}}]}}"""


async def evaluate_verdict(category: str, english_text: str) -> list[dict]:
    """One LLM call per turn, checking all 4 features for the turn's category
    at once — same low-temperature, no-thinking-mode, JSON-mode guards as
    extract_intent."""
    features = RUBRIC_FEATURES.get(category)
    if not features:
        raise VerdictError(f"no rubric features defined for category {category!r}")

    prompt = VERDICT_SYSTEM_PROMPT.format(
        category=category,
        features_json=json.dumps(features),
        english_text=english_text,
    )
    response = await _client.chat.completions(
        model="sarvam-30b",
        temperature=0.1,
        reasoning_effort=None,
        messages=[{"role": "user", "content": prompt}],
        request_options={"additional_body_parameters": {"response_format": {"type": "json_object"}}},
    )
    content = response.choices[0].message.content
    if not content:
        raise VerdictError(f"empty verdict response (finish_reason={response.choices[0].finish_reason!r})")
    content = content.strip()
    if content.startswith("```"):
        content = content.strip("`")
        if content.startswith("json"):
            content = content[4:]
    parsed = json.loads(content)
    feature_results = parsed["features"]

    known_ids = {f["id"] for f in features}
    for result in feature_results:
        if result.get("id") not in known_ids:
            raise VerdictError(f"model returned unknown feature id {result.get('id')!r} for category {category!r}")
    return feature_results


def aggregate_category_verdict(category: str, feature_results: list[dict]) -> dict:
    """Deterministic, pure Python — no LLM. PRD §7: pass at >=2 yes features;
    not_addressed never counts against a category, only yes/no do."""
    yes = [f for f in feature_results if f["status"] == "yes"]
    no = [f for f in feature_results if f["status"] == "no"]
    not_addressed = [f for f in feature_results if f["status"] == "not_addressed"]

    verdict = "pass" if len(yes) >= 2 else "fail"

    parts = [f"{verdict.upper()} ({len(yes)}/{len(feature_results)} features confirmed)"]
    if yes:
        parts.append("confirmed: " + ", ".join(f["id"] for f in yes))
    if no:
        parts.append("missing/vague: " + ", ".join(f["id"] for f in no))
    if not_addressed:
        parts.append("not addressed: " + ", ".join(f["id"] for f in not_addressed))

    return {
        "category": category,
        "verdict": verdict,
        "features_yes": len(yes),
        "features_no": len(no),
        "features_not_addressed": len(not_addressed),
        "summary": " — ".join(parts),
        "features": feature_results,
    }


def aggregate_session_verdict(category_verdicts: list[dict]) -> dict:
    """PRD §7: advance if >=3 of 4 categories pass. Caller passes one verdict
    per distinct category already seen this session (latest turn wins)."""
    passed = sum(1 for c in category_verdicts if c["verdict"] == "pass")
    total = len(category_verdicts)
    return {
        "overall_verdict": "advance" if passed >= 3 else "do_not_advance",
        "categories_passed": passed,
        "categories_total": total,
    }
