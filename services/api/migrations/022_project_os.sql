-- Project OS: AI intelligence, delivery phases, activity feed, note types

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'requirements',
  ADD COLUMN IF NOT EXISTS delivery_phases JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_intelligence JSONB,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE updates
  ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'internal';

CREATE TABLE IF NOT EXISTS project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_activity_project ON project_activity (project_id, created_at DESC);
