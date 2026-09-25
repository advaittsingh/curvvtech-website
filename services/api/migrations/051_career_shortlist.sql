-- Shortlisted pile + interview scheduling fields for careers.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'career_applications'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
      AND pg_get_constraintdef(c.oid) NOT ILIKE '%shortlisted%'
  LOOP
    EXECUTE format('ALTER TABLE career_applications DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE career_applications DROP CONSTRAINT IF EXISTS career_applications_status_check;

ALTER TABLE career_applications
  ADD CONSTRAINT career_applications_status_check
  CHECK (status IN ('new', 'shortlisted', 'rejected'));

ALTER TABLE career_applications
  ADD COLUMN IF NOT EXISTS shortlisted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interview_duration_min INTEGER,
  ADD COLUMN IF NOT EXISTS interview_meet_url TEXT,
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS interview_note TEXT,
  ADD COLUMN IF NOT EXISTS interview_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_email_sent_at TIMESTAMPTZ;
