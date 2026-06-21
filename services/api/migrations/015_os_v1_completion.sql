-- CurvvTech OS V1 completion: RBAC support fields, finance, CMS, team, leads

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#111111',
  ADD COLUMN IF NOT EXISTS email_from TEXT,
  ADD COLUMN IF NOT EXISTS smtp_host TEXT,
  ADD COLUMN IF NOT EXISTS smtp_port INT,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT,
  ADD COLUMN IF NOT EXISTS smtp_pass TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS tax_percent NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_cents BIGINT NOT NULL DEFAULT 0;

ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS contract_notes TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS budget_cents BIGINT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS target_end_date DATE;

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members (project_id);

CREATE TABLE IF NOT EXISTS client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'note',
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  author_user_id TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_comms_client ON client_communications (client_id);

ALTER TABLE cms_services
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS content_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE cms_portfolio
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS case_study_body TEXT,
  ADD COLUMN IF NOT EXISTS metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS before_image_url TEXT,
  ADD COLUMN IF NOT EXISTS after_image_url TEXT;

CREATE TABLE IF NOT EXISTS cms_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  company TEXT,
  review TEXT NOT NULL DEFAULT '',
  rating INT NOT NULL DEFAULT 5,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  position TEXT,
  bio TEXT,
  photo_url TEXT,
  linkedin_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  sections_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

ALTER TABLE payroll_entries
  ADD COLUMN IF NOT EXISTS slip_url TEXT;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions (user_id);

ALTER TABLE demo_requests
  ADD COLUMN IF NOT EXISTS converted_lead_id UUID REFERENCES crm_leads (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices (project_id);
