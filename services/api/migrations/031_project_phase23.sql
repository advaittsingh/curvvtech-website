-- Project OS Phase 2 & 3: revisions, change orders, scope, resources, deployment

ALTER TABLE file_folders
  ADD COLUMN IF NOT EXISTS folder_kind TEXT;

-- ─── Revisions ───
CREATE TABLE IF NOT EXISTS project_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  revision_number INT NOT NULL DEFAULT 1,
  requested_by TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  files_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_by TEXT,
  hours_spent NUMERIC,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_revisions_project ON project_revisions (project_id, revision_number DESC);

-- ─── Change orders ───
CREATE TABLE IF NOT EXISTS project_change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  estimated_hours NUMERIC,
  cost_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  invoice_id UUID REFERENCES invoices (id) ON DELETE SET NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_change_orders_project ON project_change_orders (project_id);

-- ─── Scope items ───
CREATE TABLE IF NOT EXISTS project_scope_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'included',
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  cost_cents BIGINT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_scope_project ON project_scope_items (project_id, category, sort_order);

-- ─── Resource allocations ───
CREATE TABLE IF NOT EXISTS project_resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  allocation_pct INT NOT NULL DEFAULT 100 CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
  estimated_hours NUMERIC NOT NULL DEFAULT 0,
  actual_hours NUMERIC NOT NULL DEFAULT 0,
  weekly_capacity_hours NUMERIC NOT NULL DEFAULT 40,
  efficiency_pct INT NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_resources_project ON project_resource_allocations (project_id);

-- ─── Deployment config ───
CREATE TABLE IF NOT EXISTS project_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects (id) ON DELETE CASCADE,
  hosting TEXT,
  server TEXT,
  domain TEXT,
  github_repo TEXT,
  github_branch TEXT NOT NULL DEFAULT 'main',
  production_url TEXT,
  staging_url TEXT,
  ssl_status TEXT NOT NULL DEFAULT 'active',
  cron_jobs JSONB NOT NULL DEFAULT '[]'::jsonb,
  database_info TEXT,
  api_keys_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  env_notes TEXT,
  last_deployed_at TIMESTAMPTZ,
  last_deployed_by TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_deployment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'production',
  version TEXT,
  deployed_by TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  notes TEXT,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_deploy_history ON project_deployment_history (project_id, deployed_at DESC);
