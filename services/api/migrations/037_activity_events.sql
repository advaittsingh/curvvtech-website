-- Client Portal — Phase 1: Unified activity / timeline engine.
-- One event stream powers admin feeds, client timelines, notifications, AI context, audit.

CREATE TABLE IF NOT EXISTS activity_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients (id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects (id) ON DELETE SET NULL,

  actor_type      TEXT NOT NULL,          -- staff | client | system | ai
  actor_id        TEXT,
  actor_name      TEXT,

  event_type      TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       UUID,

  title           TEXT NOT NULL,
  body            TEXT,
  metadata_json   JSONB NOT NULL DEFAULT '{}',

  visibility      visibility_level NOT NULL DEFAULT 'internal',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_client
  ON activity_events (client_id, created_at DESC) WHERE visibility = 'client';
CREATE INDEX IF NOT EXISTS idx_activity_events_project
  ON activity_events (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_org
  ON activity_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_type
  ON activity_events (event_type, created_at DESC);
