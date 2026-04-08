-- Email/password auth + refresh session (replaces Cognito for mobile)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMPTZ;

-- At most one password-based account per normalized email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_password_unique
  ON users (lower(trim(email)))
  WHERE password_hash IS NOT NULL AND email IS NOT NULL AND trim(email) <> '';
