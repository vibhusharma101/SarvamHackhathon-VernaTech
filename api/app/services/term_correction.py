"""Repairs technical terms mangled by ASR before they reach the scorer.

The STT `prompt=` domain hint (app/services/sarvam_intent.py
DOMAIN_HINT_PROMPT) was supposed to be enough on its own. Measured against
live sessions, it isn't — real transcripts from the DB contained:

    "A-Disk's sliding window"      -> Redis
    "I don't see that issue with Konkan" -> concurrency
    "strict asset consistency"     -> strict ACID consistency
    "heat dump" / "growing catch"  -> heap dump / growing cache
    "APL latency"                  -> API latency
    "scratched with Chrome errors" -> crashed with OOM errors

These are PHONETIC corruptions, not typos — edit-distance or fuzzy matching
against a glossary does not recover them ("Konkan" is nowhere near
"concurrency" by character distance). An LLM reading the surrounding
engineering context does, so this is a small dedicated repair call.

Deliberately conservative: the model is told to change only mis-transcribed
technical terms, and the result is rejected outright if it comes back
suspiciously different in length (see _looks_safe) — a correction pass that
silently rewrites a candidate's answer would be far worse than a few
uncorrected terms.
"""

import logging

from app.config import SARVAM_API_KEY

logger = logging.getLogger(__name__)

BASE_URL = "https://api.sarvam.ai"

GLOSSARY = (
    "Redis, Postgres, PostgreSQL, MySQL, MongoDB, NoSQL, SQL, Kafka, RabbitMQ, "
    "OOM (out of memory), API, ACID, JVM, heap dump, garbage collection, cache, "
    "caching, eviction policy, sliding window, rate limiter, throttling, "
    "partition, partitioning, sharding, replica, replication, index, schema, "
    "normalization, denormalized, star schema, concurrency, race condition, "
    "deadlock, mutex, lock, queue, message queue, event queue, idempotency, "
    "latency, throughput, load balancer, connection pool, batch export, "
    "eventual consistency, strong consistency, CAP theorem, REST, gRPC, "
    "microservice, backpressure, circuit breaker, retry, timeout"
)

CORRECTION_PROMPT = f"""You are repairing speech-to-text output from a backend engineering interview.

The transcript was produced by an ASR system that frequently mangles technical
terms into phonetically similar everyday words. Your ONLY job is to restore
those technical terms.

Common technical vocabulary in this domain:
{GLOSSARY}

Examples of the corruption pattern you are fixing:
  "A-Disk's sliding window"        -> "Redis sliding window"
  "issue with Konkan"              -> "issue with concurrency"
  "strict asset consistency"       -> "strict ACID consistency"
  "I took a heat dump"             -> "I took a heap dump"
  "found a growing catch"          -> "found a growing cache"
  "APL latency spiked"             -> "API latency spiked"
  "servers scratched with Chrome errors" -> "servers crashed with OOM errors"
  "we used no sequel"              -> "we used NoSQL"
  "we kept it as post"             -> "we kept it as Postgres"

THE PHONETIC RULE (most important):
A replacement is only valid if it SOUNDS LIKE the word it replaces. You are
undoing a mishearing, so the corrected term must be something the ASR could
plausibly have misheard as that exact word. "post" sounds like "Postgres", so
that is valid. "post" does NOT sound like "NoSQL", so that would be wrong —
even if "NoSQL" fits the topic better. If a word looks wrong but no
phonetically similar technical term exists, LEAVE IT ALONE.

Never let the topic talk you into a replacement the sound doesn't support.
Doing so can reverse what the speaker actually claimed — for instance turning
a database they REJECTED into the one they CHOSE — which corrupts the record.

STRICT RULES:
- Fix ONLY words that are clearly mis-transcribed technical terms.
- Do NOT rephrase, summarize, expand, shorten, translate, or "improve" anything.
- Do NOT fix grammar, filler words, hesitation, or awkward phrasing — those are
  how the person actually spoke and must survive untouched.
- Do NOT add technical detail the speaker did not say. If an answer is vague,
  it stays vague. Never invent a mechanism, tool, or reason.
- Preserve which things the speaker chose vs. rejected vs. merely considered.
  Never swap one for another.
- If nothing is clearly mis-transcribed, return the text completely unchanged.

Return only this JSON, no prose:
{{"corrected": "..."}}"""

# A repair pass should barely move the length. Anything outside this band means
# the model rewrote/summarized/expanded instead of correcting terms, so the
# original is kept. Guards against the correction pass inventing evidence.
_MIN_LENGTH_RATIO = 0.6
_MAX_LENGTH_RATIO = 1.6


def _looks_safe(original: str, corrected: str) -> bool:
    if not corrected.strip():
        return False
    ratio = len(corrected) / max(len(original), 1)
    return _MIN_LENGTH_RATIO <= ratio <= _MAX_LENGTH_RATIO


async def correct_technical_terms(text: str) -> str:
    """Best-effort. Any failure (API error, bad JSON, unsafe-looking rewrite)
    returns the original text — a scoring pass must never be lost to this."""
    if not text or not text.strip():
        return text

    # Imported here so this module stays importable without the scoring stack.
    from app.services.sarvam_llm import _chat_completion

    try:
        result = await _chat_completion(CORRECTION_PROMPT, text)
        corrected = (result.get("corrected") or "").strip()
    except Exception:
        logger.exception("technical-term correction failed; using raw transcript")
        return text

    if not _looks_safe(text, corrected):
        logger.warning(
            "technical-term correction rejected (len %d -> %d); using raw transcript",
            len(text),
            len(corrected),
        )
        return text
    return corrected
