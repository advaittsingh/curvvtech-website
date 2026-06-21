-- Sales pipeline stages + activity timeline for inbound opportunities

ALTER TABLE demo_requests
  ADD COLUMN IF NOT EXISTS sales_stage TEXT DEFAULT 'new';

UPDATE demo_requests SET sales_stage = 'new' WHERE sales_stage IS NULL;
UPDATE demo_requests
  SET sales_stage = 'discovery_scheduled'
  WHERE status = 'confirmed' AND sales_stage = 'new' AND converted_lead_id IS NULL;
UPDATE demo_requests
  SET sales_stage = 'won'
  WHERE converted_lead_id IS NOT NULL AND sales_stage NOT IN ('won', 'lost');

CREATE TABLE IF NOT EXISTS inbound_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_request_id UUID NOT NULL REFERENCES demo_requests (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  actor_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_activity_demo ON inbound_activity (demo_request_id, created_at DESC);
