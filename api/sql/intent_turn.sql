-- Intent MVP (contract v0) persistence. Separate from schema.sql's
-- session/turn tables — those require candidate_id/role_id/language_condition
-- from the full TRD pipeline, which this slice deliberately has none of
-- (session_id here is a client-generated UUID, not a FK into `session`).

create table intent_turn (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  turn_idx int not null,
  english_text text,
  intent jsonb,
  created_at timestamptz default now(),
  unique (session_id, turn_idx)
);
