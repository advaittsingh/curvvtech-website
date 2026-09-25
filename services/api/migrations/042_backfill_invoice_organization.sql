-- Backfill organization_id for rows created AFTER migration 034 that were
-- inserted without an org (e.g. admin-created invoices). Portal visibility is
-- scoped by organization_id, so NULL-org invoices were invisible/unpayable in
-- the client portal even after being "sent".
--
-- Prefer the row's own client/project org; fall back to the Curvvtech default.

DO $$
DECLARE curvv UUID;
BEGIN
  SELECT id INTO curvv FROM organizations WHERE slug = 'curvvtech' LIMIT 1;

  -- Invoices: inherit from client, then project, then default org.
  UPDATE invoices i
  SET organization_id = COALESCE(
    (SELECT c.organization_id FROM clients c WHERE c.id = i.client_id),
    (SELECT p.organization_id FROM projects p WHERE p.id = i.project_id),
    curvv
  )
  WHERE i.organization_id IS NULL;

  -- Files: inherit from client, then project, then default org.
  UPDATE files f
  SET organization_id = COALESCE(
    (SELECT c.organization_id FROM clients c WHERE c.id = f.client_id),
    (SELECT p.organization_id FROM projects p WHERE p.id = f.project_id),
    curvv
  )
  WHERE f.organization_id IS NULL;

  -- Tasks: inherit from project, then default org.
  UPDATE tasks t
  SET organization_id = COALESCE(
    (SELECT p.organization_id FROM projects p WHERE p.id = t.project_id),
    curvv
  )
  WHERE t.organization_id IS NULL;

  -- Clients / projects created after 034 without an org.
  UPDATE clients  SET organization_id = curvv WHERE organization_id IS NULL;
  UPDATE projects SET organization_id = curvv WHERE organization_id IS NULL;
END $$;
