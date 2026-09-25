-- Publish existing project files that live in client-facing folders (Deliverables,
-- Contracts, Designs, Assets) so they appear in the client portal immediately.

UPDATE files
SET
  visibility = 'client',
  published_at = COALESCE(files.published_at, NOW()),
  client_id = COALESCE(files.client_id, src.client_id),
  organization_id = COALESCE(files.organization_id, src.organization_id, src.client_org_id)
FROM (
  SELECT
    f.id AS file_id,
    p.client_id,
    p.organization_id,
    c.organization_id AS client_org_id
  FROM files f
  INNER JOIN file_folders ff ON ff.id = f.folder_id
  INNER JOIN projects p ON p.id = f.project_id
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE ff.folder_kind IN ('deliverables', 'contracts', 'designs', 'assets')
    AND (f.visibility IS NULL OR f.visibility::text = 'internal')
) AS src
WHERE files.id = src.file_id;

-- Files uploaded to a project but missing tenant/client linkage.
UPDATE files
SET
  client_id = p.client_id,
  organization_id = COALESCE(files.organization_id, p.organization_id, c.organization_id)
FROM projects p
LEFT JOIN clients c ON c.id = p.client_id
WHERE files.project_id = p.id
  AND (files.client_id IS NULL OR files.organization_id IS NULL);
