-- Durable idempotency for POST /v1/parse-lead (multi-instance safe)

CREATE TABLE IF NOT EXISTS parse_lead_idempotency (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_parse_lead_idem_created ON parse_lead_idempotency (created_at);
