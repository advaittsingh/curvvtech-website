-- Client-facing website / app URLs published under Deliverables in the portal.
CREATE TABLE IF NOT EXISTS project_deliverable_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Website',
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'client' CHECK (visibility IN ('client', 'internal')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_deliverable_urls_project
  ON project_deliverable_urls(project_id);

-- Seed from existing live_url so nothing is lost.
INSERT INTO project_deliverable_urls (project_id, label, url, sort_order, visibility)
SELECT p.id, 'Live website', p.live_url, 0, 'client'
FROM projects p
WHERE p.live_url IS NOT NULL
  AND trim(p.live_url) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM project_deliverable_urls u
    WHERE u.project_id = p.id AND lower(trim(u.url)) = lower(trim(p.live_url))
  );
