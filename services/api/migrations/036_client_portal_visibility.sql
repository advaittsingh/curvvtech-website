-- Client Portal — Phase 2: Standardized visibility + publish workflow.

DO $$ BEGIN
  CREATE TYPE visibility_level AS ENUM ('internal', 'client', 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Files
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS visibility visibility_level NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by_user_id TEXT;

-- Tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS visibility visibility_level NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by_user_id TEXT;

-- Milestones (client-facing by default)
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS visibility visibility_level NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by_user_id TEXT;

-- Project revisions
ALTER TABLE project_revisions
  ADD COLUMN IF NOT EXISTS visibility visibility_level NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by_user_id TEXT;

-- Change orders
ALTER TABLE project_change_orders
  ADD COLUMN IF NOT EXISTS visibility visibility_level NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by_user_id TEXT;

-- Scope items (client-facing by default)
ALTER TABLE project_scope_items
  ADD COLUMN IF NOT EXISTS visibility visibility_level NOT NULL DEFAULT 'client';

CREATE INDEX IF NOT EXISTS idx_files_client_visible
  ON files (client_id) WHERE visibility = 'client';
CREATE INDEX IF NOT EXISTS idx_tasks_visible
  ON tasks (project_id) WHERE visibility = 'client';
