-- Recruiter-added context that persists across rescores. Read by
-- app/services/scoring_service.py on every scoring pass, not just the one
-- that saved it — a session "remembers" the note going forward.
alter table session add column if not exists recruiter_note text;
