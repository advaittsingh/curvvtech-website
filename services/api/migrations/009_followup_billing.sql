-- FollowUp SaaS billing (Razorpay) + payment methods + invoices mirror

ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_subscription_status TEXT NOT NULL DEFAULT 'none';
COMMENT ON COLUMN users.billing_subscription_status IS 'none | created | active | paused | cancelled | completed | halted | past_due';

CREATE INDEX IF NOT EXISTS idx_users_rzp_customer ON users (razorpay_customer_id) WHERE razorpay_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  razorpay_token_id TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'card',
  last4 TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  network TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bpm_user_token ON billing_payment_methods (user_id, razorpay_token_id);
CREATE INDEX IF NOT EXISTS idx_bpm_user ON billing_payment_methods (user_id);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  razorpay_invoice_id TEXT NOT NULL,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'issued',
  pdf_url TEXT,
  host_invoice_url TEXT,
  short_url TEXT,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (razorpay_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_user ON billing_invoices (user_id, issued_at DESC);

ALTER TABLE wa_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
