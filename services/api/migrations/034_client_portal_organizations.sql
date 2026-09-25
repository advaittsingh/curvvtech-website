-- Client Portal — Phase 0: Organization tenant layer (agency/workspace).
-- Curvvtech is Tenant #1. Future white-label agencies are additional rows.
-- NOT related to bos_organizations (separate Business OS product).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active',
  branding_json   JSONB NOT NULL DEFAULT '{}',
  domain_json     JSONB NOT NULL DEFAULT '{}',
  settings_json   JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Curvvtech as org #1 (idempotent).
INSERT INTO organizations (name, slug, branding_json)
SELECT 'Curvvtech', 'curvvtech',
  '{"brand_color":"#111111","company_name":"Curvvtech"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'curvvtech');

-- Backfill organization_id on core tables.
ALTER TABLE clients          ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations (id);
ALTER TABLE projects         ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations (id);
ALTER TABLE invoices         ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations (id);
ALTER TABLE files            ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations (id);
ALTER TABLE tasks            ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations (id);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations (id);

DO $$
DECLARE curvv UUID;
BEGIN
  SELECT id INTO curvv FROM organizations WHERE slug = 'curvvtech' LIMIT 1;
  UPDATE clients          SET organization_id = curvv WHERE organization_id IS NULL;
  UPDATE projects         SET organization_id = curvv WHERE organization_id IS NULL;
  UPDATE invoices         SET organization_id = curvv WHERE organization_id IS NULL;
  UPDATE files            SET organization_id = curvv WHERE organization_id IS NULL;
  UPDATE tasks            SET organization_id = curvv WHERE organization_id IS NULL;
  UPDATE company_settings SET organization_id = curvv WHERE organization_id IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_org  ON clients (organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects (organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices (organization_id);
CREATE INDEX IF NOT EXISTS idx_files_org    ON files (organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org    ON tasks (organization_id);
