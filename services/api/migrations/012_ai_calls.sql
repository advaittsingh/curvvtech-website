-- AI calling MVP: call status fields + call logs (admin CRM leads)
-- Safe to run on existing DBs: IF NOT EXISTS / conditional ALTERs.

-- --- Extend crm_leads with calling state ---
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS call_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_call_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS do_not_call BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_crm_leads_call_status ON crm_leads (call_status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_next_call_at ON crm_leads (next_call_at);

-- --- Call logs (one row per call attempt) ---
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_lead_id UUID NOT NULL REFERENCES crm_leads (id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'twilio',
  provider_call_id TEXT,
  status TEXT NOT NULL,
  outcome TEXT,
  to_e164 TEXT,
  from_e164 TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  recording_url TEXT,
  transcript TEXT,
  summary TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_lead_created ON call_logs (crm_lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON call_logs (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_call_logs_provider_call ON call_logs (provider, provider_call_id)
  WHERE provider_call_id IS NOT NULL AND provider_call_id <> '';

