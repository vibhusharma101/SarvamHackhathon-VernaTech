-- Harness additions on top of schema.sql. Safe to re-run.
--
-- TRD §7 rule 1 says criteria refused in either condition are excluded from
-- MAD and the excluded count must be reported alongside it — but schema.sql
-- had nowhere to store that count, so it could only ever be computed and
-- thrown away.
alter table harness_pair add column if not exists excluded_criteria_count int default 0;

-- Lets the console/harness UI show which sessions a pair is comparing
-- without a second round-trip per pair.
create index if not exists harness_pair_english_session_idx on harness_pair (english_session_id);
create index if not exists harness_pair_vernacular_session_idx on harness_pair (vernacular_session_id);

-- One pair per profile label — re-running the harness updates a pair in
-- place rather than silently accumulating duplicates that disagree.
create unique index if not exists harness_pair_profile_label_key on harness_pair (profile_label);
