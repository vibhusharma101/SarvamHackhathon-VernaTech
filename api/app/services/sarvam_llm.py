"""Sarvam-30B calls — scoring, fluency, follow-up. Three separate call sites,
never sharing a message history (TRD §3.5: sharing state would make the
competence/fluency separation fiction)."""

import json

import httpx

from app.config import SARVAM_API_KEY

BASE_URL = "https://api.sarvam.ai"

SCORING_SYSTEM_PROMPT = """You are scoring a technical screening transcript for a backend engineering role.

You are scoring EVIDENCE OF ENGINEERING WORK, not communication quality.
Do not consider grammar, fluency, vocabulary, hesitation, or sentence structure.
These carry no information about engineering competence.

For each criterion:
- If the transcript contains evidence meeting the requirement, assign 1-5 using the
  anchors and QUOTE the exact span that justifies it.
- If it does not, return status "insufficient_evidence", score null, and state in
  `reason` what specifically was missing.

You may not assign a score without a supporting quote.
A short or incomplete answer is insufficient evidence — it is not a low score.

CRITERIA:
{criteria_json}

TRANSCRIPT (clarification turns excluded):
{english_gloss_transcript}

Return only this JSON, no prose:
{{
  "criteria": [
    {{"name": "...", "status": "scored"|"insufficient_evidence",
     "score": 1-5|null, "evidence_quote": "...", "reason": "..."}}
  ]
}}"""

FLUENCY_SYSTEM_PROMPT = (
    "Rate this speaker's English fluency 1-5 from the raw transcript: grammar, "
    "vocabulary range, hesitation, self-correction, code-switching frequency. "
    "Do NOT assess technical content, correctness, or competence — you are rating "
    'language only. Return {"english_fluency": 1-5, "notes": "..."}'
)


async def _chat_completion(system_prompt: str, user_content: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/v1/chat/completions",
            headers={"Authorization": f"Bearer {SARVAM_API_KEY}"},
            json={
                "model": "sarvam-30b",
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
            },
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return json.loads(content)


async def score_criteria(criteria_json: str, english_gloss_transcript: str) -> dict:
    """One scoring run. Caller fires this 3x and aggregates (see services/aggregate.py)."""
    prompt = SCORING_SYSTEM_PROMPT.format(
        criteria_json=criteria_json, english_gloss_transcript=english_gloss_transcript
    )
    return await _chat_completion(prompt, "Score the transcript above per the criteria.")


async def score_fluency(raw_original_transcript: str) -> dict:
    """Runs AFTER competence scoring completes, on the raw disfluent transcript,
    with no shared context — see module docstring."""
    return await _chat_completion(FLUENCY_SYSTEM_PROMPT, raw_original_transcript)


async def generate_follow_up(previous_answer: str) -> str:
    """Short, cheap prompt — kept separate from scoring so turn-taking never
    waits on the heavy scoring call (TRD §3.4)."""
    result = await _chat_completion(
        "Given this candidate answer, ask one specific spoken follow-up question "
        'that references something they said. Return {"follow_up": "..."}',
        previous_answer,
    )
    return result.get("follow_up", "")
