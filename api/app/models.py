"""Pydantic models for the REST contract in TRD §6. Keep this hand-synced with
`web/lib/types.ts` — no codegen today (TRD §10)."""

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel


class LanguageCondition(str, Enum):
    english = "english"
    vernacular = "vernacular"


class ScoreStatus(str, Enum):
    scored = "scored"
    insufficient_evidence = "insufficient_evidence"


# ---- Sessions ----

class CreateSessionRequest(BaseModel):
    candidate_id: str
    role_id: str
    language_condition: LanguageCondition
    spoken_language: str  # 'en-IN' | 'hi-IN' | 'te-IN'


class CreateSessionResponse(BaseModel):
    session_id: str


class SessionListItem(BaseModel):
    session_id: str
    candidate_name: str
    role_title: str
    spoken_language: str
    language_condition: LanguageCondition
    competence_overall: Optional[float] = None
    recommendation: Optional[str] = None


# ---- Scoring ----

class CriterionResult(BaseModel):
    criterion_id: str
    name: str
    status: ScoreStatus
    score: Optional[int] = None  # 1-5, NEVER 0. None when insufficient.
    evidence_quote_original: Optional[str] = None
    evidence_quote_english: Optional[str] = None
    reason: Optional[str] = None
    low_consistency: bool = False


class LanguageProficiencyResult(BaseModel):
    english_fluency: int  # 1-5
    disfluency_notes: Optional[str] = None


class Scorecard(BaseModel):
    session_id: str
    scoring_pass_id: str
    criteria: list[CriterionResult]
    criteria_scored: int
    criteria_insufficient: int
    overall: Optional[float] = None  # mean of scored criteria only
    language_proficiency: Optional[LanguageProficiencyResult] = None


# ---- Latency (TRD §8 — median/max per session, n visible; pooled p50/p95 across the day) ----

class HopLatency(BaseModel):
    median_ms: float
    max_ms: float
    n: int


class SessionLatency(BaseModel):
    session_id: str
    speech_end_to_asr_final: HopLatency
    asr_final_to_llm_first_token: HopLatency
    llm_first_token_to_tts_first_byte: HopLatency
    tts_first_byte_to_playback_start: HopLatency


# ---- Harness (TRD §7) ----

class HarnessPairResult(BaseModel):
    id: str
    profile_label: str
    english_session_id: str
    vernacular_session_id: str
    competence_mad: Optional[float] = None
    max_observed_gap: Optional[float] = None
    proficiency_delta: Optional[float] = None
    english_run_variance: Optional[float] = None
    vernacular_run_variance: Optional[float] = None
    excluded_criteria_count: int = 0
    runs_per_session: int = 3


class RunHarnessRequest(BaseModel):
    profile_labels: Optional[list[str]] = None  # None = all seeded profiles


# ---- Writeback ----

class WritebackResult(BaseModel):
    beeceptor_status: int
    slack_status: Optional[int] = None
    payload: dict


# ---- Intent MVP (contract v0) — parallel slice, does not touch the models above ----

class StructuredIntent(BaseModel):
    action: str
    key_entities: list[str]
    summary: str


class IntentBroadcast(BaseModel):
    type: Literal["intent"] = "intent"
    session_id: str
    turn_idx: int
    english_text: str
    intent: StructuredIntent
