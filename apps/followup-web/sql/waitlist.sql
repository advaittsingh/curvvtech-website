-- Run this in Vercel Postgres → Query / SQL editor (or `psql`) once per project.
CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  contact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
