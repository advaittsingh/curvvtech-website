-- Inbound opportunities (demo requests + future contact/whatsapp sources)

ALTER TABLE demo_requests
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS requirements TEXT,
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS budget TEXT,
  ADD COLUMN IF NOT EXISTS timeline TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS inbound_source TEXT DEFAULT 'demo_booking',
  ADD COLUMN IF NOT EXISTS ai_intelligence JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_score NUMERIC(5, 1),
  ADD COLUMN IF NOT EXISTS deal_value_cents BIGINT,
  ADD COLUMN IF NOT EXISTS close_probability INTEGER,
  ADD COLUMN IF NOT EXISTS assigned_user_id TEXT,
  ADD COLUMN IF NOT EXISTS converted_client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests (status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_lead_score ON demo_requests (lead_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_demo_requests_converted ON demo_requests (converted_lead_id);
