-- Restricted staff access: single-use, expiring invitations.
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (
    role IN ('super_admin', 'admin', 'sales', 'project_manager', 'developer', 'designer', 'accountant')
  ),
  invited_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email
  ON staff_invitations (lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_pending
  ON staff_invitations (expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
