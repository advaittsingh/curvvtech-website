-- Client Portal — Phase 1: Client notifications (in-app bell).

CREATE TABLE IF NOT EXISTS client_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  client_user_id    UUID REFERENCES client_users (id) ON DELETE CASCADE,   -- null = broadcast to client account
  client_id         UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,

  type              TEXT NOT NULL,        -- invoice | task | approval | message | meeting | file | system
  title             TEXT NOT NULL,
  body              TEXT NOT NULL DEFAULT '',
  action_json       JSONB NOT NULL DEFAULT '{}',

  read_at           TIMESTAMPTZ,
  activity_event_id UUID REFERENCES activity_events (id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_notifications_user
  ON client_notifications (client_user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_notifications_client
  ON client_notifications (client_id, created_at DESC);
