-- Lead pipeline: new stages, tracking fields, conversion links

ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS expected_close_date DATE,
  ADD COLUMN IF NOT EXISTS requirements TEXT,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS probability INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS converted_client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_proposal_id UUID REFERENCES proposals (id) ON DELETE SET NULL;

-- Migrate legacy statuses to new pipeline stages
UPDATE crm_leads SET status = 'qualified' WHERE status = 'contacted';
UPDATE crm_leads SET status = 'discovery_call' WHERE status = 'in_discussion';
UPDATE crm_leads SET status = 'negotiation' WHERE status = 'negotiation';
UPDATE crm_leads SET status = 'lost' WHERE status IN ('closed', 'lost');
UPDATE crm_leads SET status = 'lost' WHERE status NOT IN (
  'new', 'qualified', 'discovery_call', 'proposal_sent', 'negotiation', 'won', 'lost'
) AND status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads (status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source ON crm_leads (source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON crm_leads (assigned_to_clerk_id);
