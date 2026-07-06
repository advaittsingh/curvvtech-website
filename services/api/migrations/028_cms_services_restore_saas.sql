-- Ensure SaaS Product Development exists (may have been replaced by ad-hoc entries)

INSERT INTO cms_services (title, slug, description, icon, sort_order, published, status, content_json)
VALUES (
  'SaaS Product Development',
  'saas-product-development',
  'End-to-end SaaS products built to scale.',
  '/images/home/innovation/brand.svg',
  4,
  true,
  'published',
  '{"accent":"pink"}'::jsonb
)
ON CONFLICT (slug) WHERE slug <> '' DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  published = true,
  status = 'published',
  content_json = EXCLUDED.content_json,
  "updatedAt" = NOW();
