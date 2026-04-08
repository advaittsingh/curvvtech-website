-- Demo booking: time slots + requests (Curvvtech / FollowUp marketing).

CREATE TABLE IF NOT EXISTS demo_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  "time" TIME NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, "time")
);

CREATE INDEX IF NOT EXISTS idx_demo_slots_date_available
  ON demo_slots (date)
  WHERE is_booked = FALSE;

CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES demo_slots(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  date DATE NOT NULL,
  "time" TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_sort ON demo_requests (date DESC, "time" DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests (status);
