-- Recruiter notes tagged to a SPECIFIC rubric criterion, not the whole
-- session — read by scoring_service.py and injected into that criterion's
-- own object in the prompt, so a rescore actually re-evaluates the right
-- takeaway with the right context, not every criterion equally.
create table if not exists criterion_note (
  session_id uuid not null references session(id),
  criterion_id uuid not null references rubric_criterion(id),
  note text,
  primary key (session_id, criterion_id)
);
