-- Proposal management: metadata, extended statuses, view tracking

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS expected_close_date DATE,
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT,
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

ALTER TABLE proposal_sections
  ADD COLUMN IF NOT EXISTS block_type TEXT NOT NULL DEFAULT 'text';

CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals (lead_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal ON proposal_events (proposal_id);
