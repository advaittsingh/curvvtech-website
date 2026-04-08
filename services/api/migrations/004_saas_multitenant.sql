-- Multi-tenant SaaS core: tenants, memberships, WhatsApp accounts, inbox + CRM extensions

-- ─── Tenants & membership ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_users (
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users (user_id);

-- One WhatsApp Cloud API line per row (Meta phone_number_id is globally unique)
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_tenant ON whatsapp_accounts (tenant_id);

-- ─── Backfill: one tenant + admin membership per user without membership ───
DO $$
DECLARE
  r RECORD;
  tid UUID;
BEGIN
  FOR r IN
    SELECT u.id AS uid, u.email
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM tenant_users tu WHERE tu.user_id = u.id)
  LOOP
    INSERT INTO tenants (name, slug)
    VALUES (
      COALESCE(NULLIF(TRIM(r.email), ''), 'Organization'),
      'org-' || REPLACE(r.uid::TEXT, '-', '')
    )
    RETURNING id INTO tid;

    INSERT INTO tenant_users (tenant_id, user_id, role) VALUES (tid, r.uid, 'admin');
  END LOOP;
END $$;

-- Migrate linked WhatsApp lines from users → whatsapp_accounts
INSERT INTO whatsapp_accounts (tenant_id, phone_number_id, display_name)
SELECT tu.tenant_id, u.whatsapp_phone_number_id, u.whatsapp_business_display_name
FROM users u
JOIN tenant_users tu ON tu.user_id = u.id AND tu.role = 'admin'
WHERE u.whatsapp_phone_number_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM whatsapp_accounts wa WHERE wa.phone_number_id = u.whatsapp_phone_number_id)
ON CONFLICT (phone_number_id) DO NOTHING;

-- ─── Conversations: tenant scope + inbox fields ────────────────────────────
ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants (id) ON DELETE CASCADE;

ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS unread_count INT NOT NULL DEFAULT 0;

ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES users (id) ON DELETE SET NULL;

UPDATE wa_conversations c
SET tenant_id = sub.tenant_id
FROM (
  SELECT DISTINCT ON (c2.id) c2.id AS cid, tu.tenant_id
  FROM wa_conversations c2
  JOIN tenant_users tu ON tu.user_id = c2.user_id
  ORDER BY c2.id, tu.tenant_id
) sub
WHERE c.id = sub.cid AND c.tenant_id IS NULL;

-- Safety: any orphan rows → attach to first tenant (should not happen post-backfill)
UPDATE wa_conversations
SET tenant_id = (SELECT id FROM tenants ORDER BY created_at LIMIT 1)
WHERE tenant_id IS NULL;

ALTER TABLE wa_conversations ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_conv_tenant_last ON wa_conversations (tenant_id, last_message_at DESC);

-- One thread per tenant + customer (supports multiple WhatsApp lines per tenant later)
ALTER TABLE wa_conversations DROP CONSTRAINT IF EXISTS wa_conversations_user_id_customer_wa_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_conv_tenant_customer ON wa_conversations (tenant_id, customer_wa_id);

-- ─── Messages: type, payload, delivery tracking ─────────────────────────────
ALTER TABLE wa_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';

ALTER TABLE wa_messages
  ADD COLUMN IF NOT EXISTS media_id TEXT;

ALTER TABLE wa_messages
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;

ALTER TABLE wa_messages
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'received';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wa_messages_message_type_check'
  ) THEN
    ALTER TABLE wa_messages
      ADD CONSTRAINT wa_messages_message_type_check
      CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'unknown'));
  END IF;
END $$;

-- ─── Leads (CRM) ────────────────────────────────────────────────────────────
ALTER TABLE wa_leads
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants (id) ON DELETE CASCADE;

ALTER TABLE wa_leads
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE wa_leads
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

ALTER TABLE wa_leads
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

UPDATE wa_leads wl
SET tenant_id = c.tenant_id
FROM wa_conversations c
WHERE c.id = wl.conversation_id AND wl.tenant_id IS NULL;

UPDATE wa_leads SET tenant_id = (SELECT id FROM tenants ORDER BY created_at LIMIT 1) WHERE tenant_id IS NULL;

ALTER TABLE wa_leads ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_leads_tenant ON wa_leads (tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_leads_status ON wa_leads (tenant_id, status);

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_lead_id UUID NOT NULL REFERENCES wa_leads (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities (wa_lead_id, created_at DESC);

-- ─── Automation (rules engine) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 0,
  trigger JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant ON automation_rules (tenant_id, enabled, priority DESC);

CREATE TABLE IF NOT EXISTS automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules (id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 0,
  action JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_actions_rule ON automation_actions (rule_id, step_order);
