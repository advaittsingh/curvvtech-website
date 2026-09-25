-- Client Portal — Phase 0: Client identity (separate from staff `users`).

CREATE TABLE IF NOT EXISTS client_users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  password_hash     TEXT,
  name              TEXT NOT NULL DEFAULT '',
  phone             TEXT,
  role              TEXT NOT NULL DEFAULT 'viewer',        -- owner | manager | finance | viewer
  status            TEXT NOT NULL DEFAULT 'invited',       -- invited | active | suspended
  invite_token      TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users (client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_email  ON client_users (organization_id, email);

CREATE TABLE IF NOT EXISTS client_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id     UUID NOT NULL REFERENCES client_users (id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent         TEXT,
  ip_address         TEXT,
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_sessions_user
  ON client_sessions (client_user_id) WHERE revoked_at IS NULL;

-- Password reset tokens.
CREATE TABLE IF NOT EXISTS client_password_resets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL REFERENCES client_users (id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE,
  expires_at     TIMESTAMPTZ NOT NULL,
  used_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
