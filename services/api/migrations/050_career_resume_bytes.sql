DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'career_applications'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%resume_storage%'
  LOOP
    EXECUTE format('ALTER TABLE career_applications DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE career_applications
  ADD CONSTRAINT career_applications_resume_storage_check
  CHECK (resume_storage IN ('disk', 's3', 'db'));

ALTER TABLE career_applications
  ADD COLUMN IF NOT EXISTS resume_bytes BYTEA;
