-- Team hub: hiring tracker
CREATE TABLE IF NOT EXISTS open_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_open_positions_status ON open_positions (status);
