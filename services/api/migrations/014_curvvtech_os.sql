-- CurvvTech OS: Operations, CMS, company settings

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'CurvvTech',
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  cash_in_bank_cents BIGINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO company_settings (company_name)
SELECT 'CurvvTech'
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);

CREATE TABLE IF NOT EXISTS cms_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  description TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  project_type TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sop_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES sops (id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  auto_create_task BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sop_steps_sop ON sop_steps (sop_id);

CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT true,
  author_user_id TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_slug ON knowledge_articles (slug);

-- Seed default Website Project SOP
INSERT INTO sops (title, category, description, project_type)
SELECT 'Website Project SOP', 'delivery', 'Standard website delivery workflow', 'website'
WHERE NOT EXISTS (SELECT 1 FROM sops WHERE title = 'Website Project SOP');

INSERT INTO sop_steps (sop_id, sort_order, title, description, auto_create_task)
SELECT s.id, steps.ord, steps.title, steps.descr, true
FROM sops s
CROSS JOIN (VALUES
  (0, 'Lead received', 'Qualify and log in CRM'),
  (1, 'Proposal sent', 'Send proposal and track approval'),
  (2, 'Project created', 'Create project and assign team'),
  (3, 'Delivery', 'Execute milestones and tasks'),
  (4, 'Invoice', 'Send invoice and collect payment'),
  (6, 'Closure', 'Handoff and retrospective')
) AS steps(ord, title, descr)
WHERE s.title = 'Website Project SOP'
  AND NOT EXISTS (SELECT 1 FROM sop_steps WHERE sop_id = s.id);
