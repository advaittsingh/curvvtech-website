-- Business OS customer platform (bos_* tables)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Identity ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'active',
  industry TEXT,
  branding_json JSONB NOT NULL DEFAULT '{}',
  settings_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  department_id UUID,
  permissions_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bos_members_org ON bos_organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_bos_members_user ON bos_organization_members (user_id);

CREATE TABLE IF NOT EXISTS bos_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES bos_departments (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department_id UUID REFERENCES bos_departments (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Business Brain ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  domain TEXT NOT NULL DEFAULT 'general',
  entity_type TEXT,
  entity_id UUID,
  title TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  content_json JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bos_knowledge_org ON bos_knowledge_entries (organization_id);

CREATE TABLE IF NOT EXISTS bos_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'episodic',
  subject_type TEXT,
  subject_id UUID,
  content_text TEXT NOT NULL DEFAULT '',
  embedding_json JSONB,
  importance_score REAL NOT NULL DEFAULT 0.5,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bos_memories_org ON bos_memories (organization_id);

-- ─── Agent Runtime ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_agent_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_skills_json JSONB NOT NULL DEFAULT '[]',
  default_tools_json JSONB NOT NULL DEFAULT '[]',
  default_goals_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  definition_id UUID NOT NULL REFERENCES bos_agent_definitions (id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  config_json JSONB NOT NULL DEFAULT '{}',
  permissions_json JSONB NOT NULL DEFAULT '[]',
  goals_json JSONB NOT NULL DEFAULT '[]',
  memory_scope_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bos_agents_org ON bos_agents (organization_id);

CREATE TABLE IF NOT EXISTS bos_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES bos_agents (id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_ref TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  input_json JSONB NOT NULL DEFAULT '{}',
  output_json JSONB NOT NULL DEFAULT '{}',
  tokens_used INT NOT NULL DEFAULT 0,
  cost_cents INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bos_agent_tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES bos_agent_runs (id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input_json JSONB NOT NULL DEFAULT '{}',
  output_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed',
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CRM Domain ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  company_id UUID REFERENCES bos_companies (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES bos_contacts (id) ON DELETE SET NULL,
  company_id UUID REFERENCES bos_companies (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'new',
  score INT NOT NULL DEFAULT 0,
  budget_cents BIGINT,
  notes TEXT,
  assigned_agent_id UUID REFERENCES bos_agents (id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bos_leads_org ON bos_leads (organization_id, status);

CREATE TABLE IF NOT EXISTS bos_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  lead_id UUID REFERENCES bos_leads (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value_cents BIGINT NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'proposal',
  probability INT NOT NULL DEFAULT 50,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  metadata_json JSONB NOT NULL DEFAULT '{}',
  agent_id UUID REFERENCES bos_agents (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Finance Domain ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  deal_id UUID REFERENCES bos_deals (id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  total_cents BIGINT NOT NULL DEFAULT 0,
  tax_cents BIGINT NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES bos_invoices (id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  quantity INT NOT NULL DEFAULT 1,
  unit_cents BIGINT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bos_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES bos_invoices (id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'completed',
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  amount_cents BIGINT NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Marketing Domain ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'meta',
  status TEXT NOT NULL DEFAULT 'active',
  budget_cents BIGINT NOT NULL DEFAULT 0,
  spent_cents BIGINT NOT NULL DEFAULT 0,
  roas REAL NOT NULL DEFAULT 0,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  assigned_agent_id UUID REFERENCES bos_agents (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES bos_campaigns (id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  spend_cents BIGINT NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  roas REAL NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0
);

-- ─── Operations Domain ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  project_id UUID REFERENCES bos_projects (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  s3_key TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  domain TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Workflows & Events ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  trigger_type TEXT NOT NULL DEFAULT 'event',
  trigger_config_json JSONB NOT NULL DEFAULT '{}',
  graph_json JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS bos_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES bos_workflow_definitions (id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  context_json JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bos_events_org_type ON bos_events (organization_id, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS bos_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  user_id UUID REFERENCES users (id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  action_json JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Command Center ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  briefing_type TEXT NOT NULL DEFAULT 'daily',
  content_json JSONB NOT NULL DEFAULT '{}',
  generated_by_agent_id UUID REFERENCES bos_agents (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  agent_id UUID REFERENCES bos_agents (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  action_text TEXT NOT NULL DEFAULT '',
  expected_impact_json JSONB NOT NULL DEFAULT '{}',
  confidence_score INT NOT NULL DEFAULT 80,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  risk_type TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  detail_json JSONB NOT NULL DEFAULT '{}',
  potential_loss_cents BIGINT NOT NULL DEFAULT 0,
  confidence_score INT NOT NULL DEFAULT 80,
  suggested_action TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  value_json JSONB NOT NULL DEFAULT '{}',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Communications ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  external_thread_id TEXT,
  participant_json JSONB NOT NULL DEFAULT '{}',
  assigned_agent_id UUID REFERENCES bos_agents (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bos_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES bos_conversations (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content_text TEXT NOT NULL DEFAULT '',
  content_json JSONB NOT NULL DEFAULT '{}',
  agent_id UUID REFERENCES bos_agents (id) ON DELETE SET NULL,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Integrations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bos_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  credentials_json JSONB NOT NULL DEFAULT '{}',
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE TABLE IF NOT EXISTS bos_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES bos_organizations (id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Seed agent definitions ─────────────────────────────────────────────────
INSERT INTO bos_agent_definitions (slug, name, description, default_skills_json, default_tools_json, default_goals_json)
VALUES
  ('sales', 'AI Sales Employee', 'Capture, qualify, follow up, and close deals',
   '["qualify_lead","book_meeting","draft_proposal"]'::jsonb,
   '["crm.create_lead","crm.update_lead","comms.send_whatsapp"]'::jsonb,
   '["Increase qualified pipeline","Book 10 meetings per week"]'::jsonb),
  ('ad-manager', 'AI Ad Manager', 'Optimize Meta and Google ad campaigns',
   '["optimize_budget","analyze_roas","suggest_creative"]'::jsonb,
   '["marketing.fetch_metrics","marketing.adjust_budget"]'::jsonb,
   '["Maintain ROAS above 4x","Reduce CPA by 15%"]'::jsonb),
  ('finance', 'AI Finance Employee', 'Invoices, GST, expenses, and cashflow',
   '["create_invoice","send_reminder","categorize_expense"]'::jsonb,
   '["finance.create_invoice","finance.send_reminder"]'::jsonb,
   '["Zero overdue invoices","Real-time books"]'::jsonb),
  ('operations', 'AI Operations Manager', 'Tasks, projects, SOPs, and deadlines',
   '["create_task","assign_work","check_sla"]'::jsonb,
   '["ops.create_task","ops.update_project"]'::jsonb,
   '["95% on-time delivery"]'::jsonb),
  ('ceo-assistant', 'AI CEO Assistant', 'Briefings, risks, recommendations, forecasts',
   '["generate_briefing","detect_risk","recommend_action"]'::jsonb,
   '["analytics.briefing","analytics.recommend"]'::jsonb,
   '["Daily executive clarity","Proactive risk detection"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
