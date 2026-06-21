-- Client Command Center: extended profile, notes, portal fields

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS account_manager_id TEXT,
  ADD COLUMN IF NOT EXISTS portal_status TEXT NOT NULL DEFAULT 'not_invited',
  ADD COLUMN IF NOT EXISTS portal_last_login_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  author_user_id TEXT,
  body TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes (client_id);
