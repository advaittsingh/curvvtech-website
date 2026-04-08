CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  contact_name TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
