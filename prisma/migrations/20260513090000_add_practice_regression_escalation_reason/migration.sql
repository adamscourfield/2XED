-- Add PRACTICE_REGRESSION to the EscalationReason enum so that a student who
-- copes at the diagnostic but then fails a run of live practice questions can be
-- re-laned downward with an accurate reason (lanes stay live mid-lesson).
ALTER TYPE "EscalationReason" ADD VALUE IF NOT EXISTS 'PRACTICE_REGRESSION';
