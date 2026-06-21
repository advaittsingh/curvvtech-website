-- Phase 2: CRM fields, tasks, proposals, finance, files, workflows, integrations

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- CRM extended fields ---
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS budget TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS timeline TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS deal_value_cents BIGINT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- --- Tasks ---
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
  lead_id UUID REFERENCES crm_leads (id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_user_id TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks (due_at);

-- --- Proposals ---
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  client_name TEXT,
  client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
  lead_id UUID REFERENCES crm_leads (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  total_cents BIGINT NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_by_user_id TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals (status);
CREATE INDEX IF NOT EXISTS idx_proposals_share ON proposals (share_token);

CREATE TABLE IF NOT EXISTS proposal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  section_key TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_sections_proposal ON proposal_sections (proposal_id);

CREATE TABLE IF NOT EXISTS proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Expenses ---
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  amount_cents BIGINT NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor TEXT,
  receipt_s3_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by_user_id TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date DESC);

-- --- Payroll ---
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_cents BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  gross_cents BIGINT NOT NULL DEFAULT 0,
  deductions_cents BIGINT NOT NULL DEFAULT 0,
  net_cents BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_run ON payroll_entries (payroll_run_id);

-- --- Files ---
CREATE TABLE IF NOT EXISTS file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  parent_id UUID REFERENCES file_folders (id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
  created_by_user_id TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES file_folders (id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  s3_key TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  uploaded_by_user_id TEXT,
  client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_folder ON files (folder_id);

CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files (id) ON DELETE CASCADE,
  version INT NOT NULL,
  s3_key TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by_user_id TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions (file_id);

-- --- Workflows (Curvvtech admin) ---
CREATE TABLE IF NOT EXISTS curvvtech_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curvvtech_workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES curvvtech_workflows (id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS curvvtech_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES curvvtech_workflows (id) ON DELETE CASCADE,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  result JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Integrations ---
CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, user_id)
);
