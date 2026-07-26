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

The transcript is split into sections, each labeled with the criterion its
question was asking about. Score each criterion PRIMARILY from its own
labeled section. Content from a different section is not evidence for this
criterion — if the section for this criterion contains nothing relevant, the
answer is "insufficient_evidence", even if some other section happens to
discuss a related-sounding topic. Do not borrow evidence across sections.

For each criterion, use the L1-L5 anchors as a strict ladder:
- Find the HIGHEST anchor level whose requirements are FULLY and EXPLICITLY met
  by the transcript. Do NOT round up: if the transcript clearly satisfies L4 but
  doesn't explicitly state the specific extra thing L5 asks for (e.g. "what
  they'd do differently", "a named trade-off"), the score is 4, not 5. Never
  give credit for something an anchor implies but the transcript doesn't
  actually say.
- status "insufficient_evidence" is ONLY for when this criterion's section
  contains NOTHING relevant to its definition at all. A thin or weak answer
  that still touches the topic — enough to satisfy even just L1 or L2 — is a
  LOW SCORE (1 or 2), never "insufficient_evidence". Being short is not the
  same as being absent: reserve "insufficient_evidence" for genuine silence
  or a real non-answer on this specific topic, not a weak-but-real attempt.
- Quote the exact span that justifies whatever level you assign — including
  for a low score. Don't withhold a quote just because the evidence is thin;
  quote the thin evidence itself.
- If truly nothing relevant was said, return status "insufficient_evidence",
  score null, and state in `reason` what specifically was missing.
- When status is "insufficient_evidence", score MUST be null — never a number.

CRITERIA:
{criteria_json}

TRANSCRIPT (clarification turns excluded):
{english_gloss_transcript}{recruiter_notes_block}

Return only this JSON, no prose:
{{
  "criteria": [
    {{"name": "...", "status": "scored"|"insufficient_evidence",
     "score": 1-5|null, "evidence_quote": "...", "reason": "..."}}
  ]
}}"""

FLUENCY_SYSTEM_PROMPT = """Rate this speaker's English fluency from the raw ORIGINAL-LANGUAGE transcript
of what they actually said — not a translation.

Rate ONLY on: grammar, vocabulary range, hesitation, self-correction, and
code-switching frequency in the English they produced.
Do NOT assess technical content, correctness, or competence. You are rating
language production only.

You may not assign a fluency score without evidence. In "english_evidence",
copy a VERBATIM span of English that appears in the transcript, character for
character. Do not translate, transliterate, paraphrase, or invent it — it is
checked against the transcript automatically and a span that is not found
there discards your score.

If the transcript contains no English the speaker actually produced (for
example, it is written entirely in Devanagari or another Indic script), then
set "english_evidence": null and "english_fluency": null. A null is the
correct answer there, not a failure — you cannot measure someone's English
from a sentence they did not say in English.

Detected spoken language codes for this session: {language_codes}

Return only this JSON, no prose:
{{"english_fluency": 1-5 or null, "english_evidence": "verbatim span or null", "notes": "..."}}"""


async def _chat_completion(system_prompt: str, user_content: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/v1/chat/completions",
            headers={"Authorization": f"Bearer {SARVAM_API_KEY}"},
            json={
                "model": "sarvam-30b",
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
                # Thinking mode is ON by default (reasoning_effort defaults
                # to "low") — with it on, the model can put its answer in a
                # reasoning field and leave `content` null, which crashes
                # json.loads below. Found live via the scoring pipeline;
                # same failure class app/services/sarvam_intent.py hit and
                # fixed on the SDK side — this is the REST-call equivalent.
                "reasoning_effort": None,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
            },
        )
        resp.raise_for_status()
        message = resp.json()["choices"][0]["message"]
        content = message.get("content")
        if not content:
            raise ValueError(
                f"empty content from sarvam-30b (finish_reason={message.get('finish_reason')!r}, "
                f"has_reasoning={'reasoning_content' in message})"
            )
        return json.loads(content)


async def score_criteria(
    criteria_json: str, english_gloss_transcript: str, recruiter_notes: dict[str, str] | None = None
) -> dict:
    """One scoring run. Caller fires this 3x and aggregates (see services/aggregate.py).

    recruiter_notes is {criterion_name: note}. Found live: embedding a note as
    just one more key inside a criterion's JSON object (buried among id,
    definition, 5 anchors, weight) made the model ignore it entirely — its
    own stated reasoning contradicted a note that was right there in the
    input. Promoting it to its own clearly-labeled prompt section instead.
    """
    recruiter_notes_block = ""
    if recruiter_notes:
        lines = "\n".join(f'- For criterion "{name}": {note}' for name, note in recruiter_notes.items())
        recruiter_notes_block = (
            "\n\nRECRUITER-ADDED CONTEXT (added by the recruiter after the interview). Each note "
            "applies ONLY to the named criterion — treat it as additional testimony about what the "
            "candidate said or clarified for that criterion specifically, alongside the transcript. "
            f"It must NOT influence any other criterion's score:\n{lines}"
        )

    prompt = SCORING_SYSTEM_PROMPT.format(
        criteria_json=criteria_json,
        english_gloss_transcript=english_gloss_transcript,
        recruiter_notes_block=recruiter_notes_block,
    )
    return await _chat_completion(prompt, "Score the transcript above per the criteria.")


async def score_fluency(raw_original_transcript: str, language_codes: list[str] | None = None) -> dict:
    """Runs AFTER competence scoring completes, on the raw disfluent transcript,
    with no shared context — see module docstring.

    `english_fluency` comes back None when the candidate produced no
    meaningful English (e.g. a session answered entirely in Hindi). That is a
    correct result, not a gap to paper over: PRD M3 defines this field as a
    measure of *English* production, so inventing a number from an Indic-only
    transcript would put a meaningless value into the one field the harness
    reports as `proficiency_delta`.
    """
    prompt = FLUENCY_SYSTEM_PROMPT.format(language_codes=", ".join(language_codes or []) or "unknown")
    result = await _chat_completion(prompt, raw_original_transcript)

    score = result.get("english_fluency")
    if score is not None and not (isinstance(score, int) and 1 <= score <= 5):
        # Guard the DB check constraint (english_fluency between 1 and 5) —
        # a stray float/string/0 from the model becomes an explicit null
        # rather than a failed insert that loses the notes too.
        result["english_fluency"] = None
        result["notes"] = f"(unparseable score {score!r}) " + str(result.get("notes", ""))
        return result

    # Gate on whether the transcript actually contains Latin-script words.
    #
    # Asked politely, the model will rate "English fluency" off a
    # pure-Devanagari transcript and write notes asserting the speaker used
    # English — tested, it scored a 3 on a sentence containing no English at
    # all, and its "verbatim evidence" was a translation it had invented.
    # Its self-report cannot gate this; a script check can.
    if result.get("english_fluency") is not None and not _has_english_words(raw_original_transcript):
        result["english_fluency"] = None
        result["notes"] = (
            "No English speech in this transcript (it is not in Latin script), so English "
            "fluency was not assessed. " + str(result.get("notes", ""))
        )
    return result


# A couple of stray Latin tokens (a product name, an acronym) isn't English
# production worth scoring; a genuinely code-mixed answer clears this easily.
_MIN_ENGLISH_WORDS = 3


def _has_english_words(transcript: str) -> bool:
    """True when the transcript carries enough Latin-script words to be
    rating someone's English on.

    Note the deliberate limitation: Sarvam's transcribe mode often renders
    spoken English technical terms in Devanagari ("स्लाइडिंग विंडो" for
    "sliding window"), and those read as non-English here. That direction of
    error is the safe one — it withholds a fluency number rather than
    inventing one.
    """
    latin_words = [w for w in transcript.split() if sum(c.isascii() and c.isalpha() for c in w) >= 2]
    return len(latin_words) >= _MIN_ENGLISH_WORDS


async def generate_follow_up(previous_answer: str) -> str:
    """Short, cheap prompt — kept separate from scoring so turn-taking never
    waits on the heavy scoring call (TRD §3.4)."""
    result = await _chat_completion(
        "Given this candidate answer, ask one specific spoken follow-up question "
        'that references something they said. Return {"follow_up": "..."}',
        previous_answer,
    )
    return result.get("follow_up", "")
