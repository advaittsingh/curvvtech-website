-- Client Portal — Phase 5: Meetings, approvals, feedback modules.

CREATE TABLE IF NOT EXISTS meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects (id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  meet_url        TEXT,
  recording_url   TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled',   -- scheduled | completed | cancelled
  visibility      visibility_level NOT NULL DEFAULT 'client',
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_client ON meetings (client_id, starts_at DESC);

CREATE TABLE IF NOT EXISTS approval_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects (id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL,     -- milestone | revision | file | change_order | design | invoice
  entity_id       UUID NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  decided_by      UUID REFERENCES client_users (id),
  decided_at      TIMESTAMPTZ,
  comment         TEXT,
  visibility      visibility_level NOT NULL DEFAULT 'client',
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_client ON approval_requests (client_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS client_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects (id) ON DELETE SET NULL,
  rating          INT CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  context         TEXT,             -- project_completion | milestone | support | general
  created_by      UUID REFERENCES client_users (id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
