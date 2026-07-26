-- Intent MVP (contract v0) persistence. Separate from schema.sql's
-- session/turn tables — those require candidate_id/role_id/language_condition
-- from the full TRD pipeline, which this slice deliberately has none of
-- (session_id here is a client-generated UUID, not a FK into `session`).

create table if not exists intent_turn (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  turn_idx int not null,
  original_text text,
  language_code text,
  english_text text,
  intent jsonb,
  verdict jsonb,
  created_at timestamptz default now(),
  unique (session_id, turn_idx)
);

-- Safe to re-run: adds columns if this table was created before they existed.
alter table intent_turn add column if not exists original_text text;
alter table intent_turn add column if not exists language_code text;
alter table intent_turn add column if not exists verdict jsonb;
