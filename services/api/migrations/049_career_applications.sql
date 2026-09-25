CREATE TABLE IF NOT EXISTS career_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_slug TEXT NOT NULL,
  role_title TEXT NOT NULL,
  team TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin TEXT,
  message TEXT,
  resume_storage TEXT NOT NULL DEFAULT 'disk'
    CHECK (resume_storage IN ('disk', 's3')),
  resume_key TEXT NOT NULL,
  resume_filename TEXT NOT NULL,
  resume_content_type TEXT NOT NULL,
  resume_size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'rejected')),
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_applications_role_status
  ON career_applications (role_slug, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_career_applications_created
  ON career_applications (created_at DESC);
