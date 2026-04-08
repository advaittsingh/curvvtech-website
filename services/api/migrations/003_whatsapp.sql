-- WhatsApp Business Cloud API: conversations, messages, AI lead insights

ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_whatsapp_phone_number_id
  ON users (whatsapp_phone_number_id)
  WHERE whatsapp_phone_number_id IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_business_display_name TEXT;

CREATE TABLE IF NOT EXISTS wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  customer_wa_id TEXT NOT NULL,
  customer_phone_e164 TEXT,
  last_message TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, customer_wa_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_user ON wa_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_at ON wa_conversations (user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES wa_conversations (id) ON DELETE CASCADE,
  wa_message_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('business', 'customer')),
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wa_message_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_conv ON wa_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS wa_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE REFERENCES wa_conversations (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new',
  score INT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  summary TEXT NOT NULL DEFAULT '',
  follow_up_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
