// Hand-synced with api/app/models.py — no codegen today (TRD §10).

export type LanguageCondition = "english" | "vernacular";
export type ScoreStatus = "scored" | "insufficient_evidence";
export type SpokenLanguage = "en-IN" | "hi-IN" | "te-IN";

export interface CreateSessionRequest {
  candidate_id: string;
  role_id: string;
  language_condition: LanguageCondition;
  spoken_language: SpokenLanguage;
}

export interface CreateSessionResponse {
  session_id: string;
}

export interface SessionListItem {
  id: string;
  candidate: { name: string } | null;
  role: { title: string } | null;
  spoken_language: SpokenLanguage;
  language_condition: LanguageCondition;
  started_at: string;
}

export interface CriterionResult {
  criterion_id: string;
  rubric_criterion?: { name: string };
  status: ScoreStatus;
  score: number | null; // 1-5, NEVER 0. null when insufficient.
  evidence_quote_original: string | null;
  evidence_quote_english: string | null;
  reason: string | null;
  low_consistency: boolean;
}

export interface LanguageProficiencyResult {
  english_fluency: number; // 1-5
  disfluency_notes: string | null;
}

export interface Scorecard {
  session_id: string;
  scoring_pass_id: string;
  criteria: CriterionResult[];
  criteria_scored: number;
  criteria_insufficient: number;
  overall: number | null;
  language_proficiency: LanguageProficiencyResult | null;
}

export interface HopLatency {
  median_ms: number;
  max_ms: number;
  n: number;
}

export interface SessionLatency {
  session_id: string;
  speech_end_to_asr_final: HopLatency;
  asr_final_to_llm_first_token: HopLatency;
  llm_first_token_to_tts_first_byte: HopLatency;
  tts_first_byte_to_playback_start: HopLatency;
}

export interface HarnessPairResult {
  id: string;
  profile_label: string;
  english_session_id: string;
  vernacular_session_id: string;
  competence_mad: number | null;
  max_observed_gap: number | null;
  proficiency_delta: number | null;
  english_run_variance: number | null;
  vernacular_run_variance: number | null;
  runs_per_session: number;
}

export interface WritebackResult {
  beeceptor_status: number;
  slack_status: number | null;
  payload: Record<string, unknown>;
}

// ---- WS protocol (TRD §4) ----

export type ClientEvent =
  | { type: "start"; session_id: string; language: SpokenLanguage }
  | { type: "clarification_request" }
  | { type: "end" };

export type ServerEvent =
  | { type: "transcript"; text: string; is_final: boolean; turn_idx: number }
  | { type: "agent_speaking"; text: string; audio_b64: string }
  | { type: "barge_in_ack" }
  | { type: "turn_complete"; turn_idx: number }
  | { type: "screen_complete"; session_id: string }
  | { type: "error"; code: string; recoverable: boolean };

// ---- Intent MVP (contract v0) — parallel slice, does not touch the types above ----

export interface StructuredIntent {
  action: string;
  key_entities: string[];
  summary: string;
  category: string;
}

// ---- Verdict layer (hacky, tuned to the 5-prompt demo) ----

export interface FeatureResult {
  id: string;
  status: "yes" | "no" | "not_addressed";
  evidence_quote: string | null;
  reason: string;
  improvement_note: string | null;
}

export interface CategoryVerdict {
  category: string;
  verdict: "pass" | "fail";
  features_yes: number;
  features_no: number;
  features_not_addressed: number;
  summary: string;
  features: FeatureResult[];
}

export interface SessionVerdict {
  overall_verdict: "advance" | "do_not_advance";
  categories_passed: number;
  categories_total: number;
}

export interface IntentBroadcast {
  type: "intent";
  session_id: string;
  turn_idx: number;
  original_text: string;
  language_code: string;
  english_text: string;
  intent: StructuredIntent;
  category_verdict: CategoryVerdict;
  session_verdict: SessionVerdict;
}

export type CandidateAck =
  | { type: "ack"; status: "processing" }
  | { type: "ack"; status: "done"; turn_idx: number }
  | { type: "error"; message: string };

// ---- Fixed-question interview flow — real session/scoring integration ----

export interface SessionTurn {
  idx: number;
  question: string | null;
  original_text: string | null;
  language_code: string | null;
  english_text: string | null;
  is_clarification: boolean;
}

export interface InterviewStartResponse {
  session_id: string;
  questions: string[];
}

export type InterviewServerEvent =
  | { type: "question"; idx: number; total: number; text: string }
  | { type: "ack"; status: "processing" }
  | { type: "ack"; status: "done"; turn_idx: number }
  | { type: "error"; message: string }
  | { type: "complete"; session_id: string; scoring_pass_id: string | null; error?: string };
