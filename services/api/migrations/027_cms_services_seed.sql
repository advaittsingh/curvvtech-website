-- Seed canonical Curvvtech services (matches website services catalog)

CREATE UNIQUE INDEX IF NOT EXISTS cms_services_slug_unique ON cms_services (slug) WHERE slug <> '';

INSERT INTO cms_services (title, slug, description, icon, sort_order, published, status, content_json)
VALUES
  (
    'Web Development',
    'web-development',
    'Modern, scalable web applications that perform.',
    '/images/home/innovation/webdevp.svg',
    0,
    true,
    'published',
    '{"accent":"purple"}'::jsonb
  ),
  (
    'App Development',
    'app-development',
    'Native and cross-platform mobile apps that users love.',
    '/images/home/innovation/uiux.svg',
    1,
    true,
    '{"accent":"blue"}'::jsonb
  ),
  (
    'Backend & API Development',
    'backend-api-development',
    'Robust backends and APIs that power your product.',
    '/images/home/innovation/analitics.svg',
    2,
    true,
    '{"accent":"orange"}'::jsonb
  ),
  (
    'AI / Automation Solutions',
    'ai-automation-solutions',
    'Intelligent automation and AI-driven features.',
    '/images/home/innovation/digitalmarketing.svg',
    3,
    true,
    '{"accent":"green"}'::jsonb
  ),
  (
    'SaaS Product Development',
    'saas-product-development',
    'End-to-end SaaS products built to scale.',
    '/images/home/innovation/brand.svg',
    4,
    true,
    '{"accent":"pink"}'::jsonb
  ),
  (
    'Custom Software Development',
    'custom-software-development',
    'Tailored software solutions for your unique needs.',
    '/images/home/innovation/webdevp.svg',
    5,
    true,
    '{"accent":"violet"}'::jsonb
  )
ON CONFLICT (slug) WHERE slug <> '' DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  published = EXCLUDED.published,
  status = EXCLUDED.status,
  content_json = EXCLUDED.content_json,
  "updatedAt" = NOW();
