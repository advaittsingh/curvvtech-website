-- Production multi-tenant schema (run after 001_leads.sql)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_sub TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  access_allowed BOOLEAN NOT NULL DEFAULT true,
  waitlist_position INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_sub ON users (auth_sub);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  business_address TEXT NOT NULL DEFAULT '',
  business_website TEXT NOT NULL DEFAULT '',
  profile_photo_s3_key TEXT,
  id_document_s3_key TEXT,
  id_verification_status TEXT NOT NULL DEFAULT 'none',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_profiles (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  what_you_do TEXT NOT NULL DEFAULT '',
  customer_asks TEXT NOT NULL DEFAULT '',
  customer_source TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  questionnaire JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  app_version TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  fcm_token TEXT,
  apns_token TEXT,
  platform TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_user_fcm ON devices (user_id, fcm_token)
  WHERE fcm_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_user_apns ON devices (user_id, apns_token)
  WHERE apns_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user_created ON ai_chat_messages (user_id, created_at);

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_entries_contact_unique UNIQUE (contact)
);

CREATE TABLE IF NOT EXISTS landing_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_onboarding_contact ON landing_onboarding (contact);

-- Attach leads to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN user_id UUID REFERENCES users (id) ON DELETE CASCADE;
  END IF;
END $$;

INSERT INTO users (auth_sub, email, access_allowed)
SELECT 'legacy-local-migration', 'legacy@local.followup', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE auth_sub = 'legacy-local-migration');

UPDATE leads l
SET user_id = u.id
FROM users u
WHERE u.auth_sub = 'legacy-local-migration'
  AND l.user_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM leads WHERE user_id IS NULL) THEN
    ALTER TABLE leads ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_user_followup ON leads (user_id, follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON leads (user_id, created_at DESC);
