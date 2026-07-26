-- TRD §5 — run this first, against the Supabase Postgres instance.
-- Create the `turn-audio` private Storage bucket separately (TRD §2) — no SQL for that.

create table role (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  rubric_id uuid not null
);

create table candidate (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_id uuid references role(id),
  consent_ts timestamptz,
  created_at timestamptz default now()
);

create table rubric_criterion (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null,
  name text not null,
  definition text not null,
  evidence_required text not null,
  anchor_l1 text, anchor_l2 text, anchor_l3 text, anchor_l4 text, anchor_l5 text,
  weight numeric default 1.0
);

create table session (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidate(id),
  role_id uuid references role(id),
  language_condition text check (language_condition in ('english','vernacular')),
  spoken_language text,
  harness_pair_id uuid,
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table turn (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references session(id),
  idx int not null,
  asr_original_text text,
  asr_lang text,
  asr_english_gloss text,
  is_clarification boolean default false,
  audio_url text,
  segment_offsets jsonb,              -- VAD chunk boundaries, for >30s answers
  t_speech_end timestamptz,
  t_asr_final timestamptz,
  t_llm_first_token timestamptz,
  t_tts_first_byte timestamptz,
  unique (session_id, idx)
);

-- A scoring_pass is ONE invocation of scoring. It contains 3 self-consistency runs.
-- Rev 1 conflated these into a single run_index, which broke rescore.
create table scoring_pass (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references session(id),
  created_at timestamptz default now(),
  is_current boolean default true
);

create table criterion_score (
  id uuid primary key default gen_random_uuid(),
  scoring_pass_id uuid references scoring_pass(id),
  criterion_id uuid references rubric_criterion(id),
  run_index int not null check (run_index between 1 and 3),
  status text check (status in ('scored','insufficient_evidence')) not null,
  score int check (score between 1 and 5),   -- NULL on insufficient. No default. Never 0.
  evidence_quote_original text,
  evidence_quote_english text,
  reason text
);

create table criterion_result (       -- the aggregated view the console reads
  scoring_pass_id uuid references scoring_pass(id),
  criterion_id uuid references rubric_criterion(id),
  status text not null,
  score int,
  evidence_quote_original text,
  evidence_quote_english text,
  reason text,
  low_consistency boolean default false,
  primary key (scoring_pass_id, criterion_id)
);

create table language_proficiency (
  session_id uuid primary key references session(id),
  english_fluency int check (english_fluency between 1 and 5),
  disfluency_notes text
);

create table harness_pair (
  id uuid primary key default gen_random_uuid(),
  profile_label text not null,
  english_session_id uuid references session(id),
  vernacular_session_id uuid references session(id),
  competence_mad numeric,
  max_observed_gap numeric,
  proficiency_delta numeric,
  english_run_variance numeric,
  vernacular_run_variance numeric,
  runs_per_session int default 3
);
