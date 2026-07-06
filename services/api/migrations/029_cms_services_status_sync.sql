-- Align cms_services.status with published flag (production API filters on status)

ALTER TABLE cms_services
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE cms_services
SET status = 'published'
WHERE published = true AND (status IS NULL OR status = 'draft');

UPDATE cms_services
SET status = 'draft'
WHERE published = false;
