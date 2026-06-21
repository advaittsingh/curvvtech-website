-- Payroll & Compensation: profiles linked to team, structured pay runs
CREATE TABLE IF NOT EXISTS compensation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'employee',
  role_title TEXT,
  department TEXT,
  monthly_salary_cents BIGINT NOT NULL DEFAULT 0,
  pay_day INT,
  next_pay_date DATE,
  joined_at DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compensation_profiles_user ON compensation_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_compensation_profiles_type ON compensation_profiles (employment_type);
CREATE INDEX IF NOT EXISTS idx_compensation_profiles_active ON compensation_profiles (is_active);

ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS generate_payslips BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS period_label TEXT;

ALTER TABLE payroll_entries
  ADD COLUMN IF NOT EXISTS compensation_profile_id UUID REFERENCES compensation_profiles (id) ON DELETE SET NULL;
