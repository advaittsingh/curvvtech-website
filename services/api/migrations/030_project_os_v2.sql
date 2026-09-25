-- Project OS V2: extended fields, milestone metadata, idempotent historical seed

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS import_key TEXT,
  ADD COLUMN IF NOT EXISTS referred_by TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS clients_import_key_unique ON clients (import_key) WHERE import_key IS NOT NULL;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS import_key TEXT,
  ADD COLUMN IF NOT EXISTS live_url TEXT,
  ADD COLUMN IF NOT EXISTS repository_url TEXT,
  ADD COLUMN IF NOT EXISTS figma_url TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS quoted_cents BIGINT,
  ADD COLUMN IF NOT EXISTS gst_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS projects_import_key_unique ON projects (import_key) WHERE import_key IS NOT NULL;

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS completion_pct INT NOT NULL DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- ─── Historical clients (idempotent — never overwrites existing rows) ───

INSERT INTO clients (name, company, website, referred_by, import_key, notes, "createdAt", "updatedAt")
SELECT v.name, v.company, v.website, v.referred_by, v.import_key, v.notes, NOW(), NOW()
FROM (VALUES
  ('Genesis App', 'Genesis App', 'https://www.paata.ai', NULL::text, 'client:genesis-app', NULL::text),
  ('Jahanavi Bhatia', 'Design Ink', NULL, 'Shubhi Garg', 'client:masako-india', 'Referral project via Shubhi Garg'),
  ('Design Ink', 'Design Ink', NULL, 'Shubhi Garg', 'client:dreamz-india', 'Referral project via Shubhi Garg'),
  ('Design Ink', 'Design Ink', NULL, 'Shubhi', 'client:lifxel', 'Referral project via Shubhi'),
  ('Blaaze', NULL, NULL, 'Shubhi', 'client:blaaze', NULL),
  ('Private Client', NULL, NULL, NULL, 'client:marketplace-analytics', NULL),
  ('Young Boy Toyz', NULL, NULL, NULL, 'client:young-boy-toyz', NULL),
  ('Sanveda NGO', 'Sanveda NGO', NULL, NULL, 'client:sanveda-ngo', NULL),
  ('TreadTrails India', 'TreadTrails India', NULL, NULL, 'client:treadtrails', NULL)
) AS v(name, company, website, referred_by, import_key, notes)
WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.import_key = v.import_key);

-- ─── Historical projects ───

INSERT INTO projects (
  client_id, name, status, progress_pct, budget_cents, quoted_cents, gst_cents,
  project_type, live_url, internal_notes, referred_by, import_key,
  completed_at, priority, tags, color, "createdAt", "updatedAt"
)
SELECT
  c.id,
  v.name,
  v.status,
  v.progress_pct,
  v.budget_cents,
  v.quoted_cents,
  v.gst_cents,
  v.project_type,
  v.live_url,
  v.internal_notes,
  v.referred_by,
  v.import_key,
  v.completed_at,
  v.priority,
  v.tags,
  v.color,
  v.created_at,
  NOW()
FROM (VALUES
  (
    'client:genesis-app',
    'Paata.ai',
    'completed',
    100,
    20848000::bigint,
    18446000::bigint,
    1890000::bigint,
    'AI Platform',
    'https://www.paata.ai',
    'AI based language learning platform. Users translate local languages into English and back using AI. Client found personally by Advait. Initial deal: App Development. Initial quote ₹105,000 + GST.',
    NULL::text,
    'project:paata-ai',
    '2024-06-01'::timestamptz,
    'high',
    ARRAY['ai', 'web-app', 'historical']::text[],
    '#8b5cf6',
    '2023-08-01'::timestamptz
  ),
  (
    'client:masako-india',
    'Masako India',
    'completed',
    100,
    4600000::bigint,
    4600000::bigint,
    0::bigint,
    'Shopify Store',
    NULL,
    'Shopify Store Development. Referral project via Shubhi Garg.',
    'Shubhi Garg',
    'project:masako-india',
    '2024-03-01'::timestamptz,
    'medium',
    ARRAY['shopify', 'historical']::text[],
    '#10b981',
    '2023-11-01'::timestamptz
  ),
  (
    'client:dreamz-india',
    'Dreamz India',
    'cancelled',
    40,
    4500000::bigint,
    4500000::bigint,
    0::bigint,
    'Shopify Store',
    NULL,
    'Shopify Store Development. Referred by Shubhi Garg. Status: Closed.',
    'Shubhi Garg',
    'project:dreamz-india',
    NULL::timestamptz,
    'low',
    ARRAY['shopify', 'historical']::text[],
    '#6b7280',
    '2023-10-01'::timestamptz
  ),
  (
    'client:lifxel',
    'Lifxel',
    'completed',
    100,
    24000000::bigint,
    24000000::bigint,
    0::bigint,
    'Mobile App',
    NULL,
    'App Development. Referred by Shubhi. Company: Design Ink.',
    'Shubhi',
    'project:lifxel',
    '2024-08-01'::timestamptz,
    'high',
    ARRAY['app', 'historical']::text[],
    '#3b82f6',
    '2024-01-01'::timestamptz
  ),
  (
    'client:blaaze',
    'Blaaze',
    'completed',
    100,
    5000000::bigint,
    5000000::bigint,
    0::bigint,
    'Website',
    NULL,
    'Website Development on Arcade platform. Referred by Shubhi.',
    'Shubhi',
    'project:blaaze',
    '2024-05-01'::timestamptz,
    'medium',
    ARRAY['website', 'arcade', 'historical']::text[],
    '#f59e0b',
    '2024-02-01'::timestamptz
  ),
  (
    'client:marketplace-analytics',
    'Private Marketplace Analytics',
    'completed',
    100,
    30500000::bigint,
    30500000::bigint,
    0::bigint,
    'Analytics Platform',
    NULL,
    'Marketplace Analytics & Tracking Platform. Future upgrade quoted at ₹50,000. Payments received in full.',
    NULL,
    'project:marketplace-analytics',
    '2024-09-01'::timestamptz,
    'high',
    ARRAY['analytics', 'historical']::text[],
    '#ec4899',
    '2024-04-01'::timestamptz
  ),
  (
    'client:young-boy-toyz',
    'Young Boy Toyz',
    'completed',
    100,
    3000000::bigint,
    3000000::bigint,
    0::bigint,
    'Landing Page',
    NULL,
    'Event Landing Page + Event OS. Payments received in full.',
    NULL,
    'project:young-boy-toyz',
    '2024-07-01'::timestamptz,
    'medium',
    ARRAY['landing-page', 'event', 'historical']::text[],
    '#ef4444',
    '2024-05-01'::timestamptz
  ),
  (
    'client:sanveda-ngo',
    'Sanveda NGO',
    'in_progress',
    50,
    1500000::bigint,
    1500000::bigint,
    0::bigint,
    'Public Website',
    NULL,
    'Public Website + NGO OS. ₹7,500 received, ₹7,500 pending.',
    NULL,
    'project:sanveda-ngo',
    NULL::timestamptz,
    'medium',
    ARRAY['ngo', 'website', 'historical']::text[],
    '#14b8a6',
    '2025-03-01'::timestamptz
  ),
  (
    'client:treadtrails',
    'TreadTrails India',
    'in_progress',
    90,
    8260000::bigint,
    7000000::bigint,
    1260000::bigint,
    'Ecommerce Website',
    NULL,
    'Ecommerce Website + Admin Panel. Budget ₹70,000 + GST. Milestones: Advance 50%, Backend 20%, Full Build 20%, Handover 10%.',
    NULL,
    'project:treadtrails',
    NULL::timestamptz,
    'high',
    ARRAY['ecommerce', 'historical']::text[],
    '#0ea5e9',
    '2025-04-01'::timestamptz
  )
) AS v(client_key, name, status, progress_pct, budget_cents, quoted_cents, gst_cents, project_type, live_url, internal_notes, referred_by, import_key, completed_at, priority, tags, color, created_at)
JOIN clients c ON c.import_key = v.client_key
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.import_key = v.import_key);

-- ─── Payment records as paid invoices (only when project has none yet) ───

INSERT INTO invoices (client_id, project_id, invoice_number, status, amount_cents, total_cents, paid_at, "createdAt", "updatedAt")
SELECT c.id, p.id, v.invoice_number, 'paid', v.amount_cents, v.amount_cents, v.paid_at, v.paid_at, NOW()
FROM (VALUES
  ('project:paata-ai', 'PAY-PAATA-01', 4956000::bigint, '2023-09-15'::timestamptz),
  ('project:paata-ai', 'PAY-PAATA-02', 1416000::bigint, '2023-11-01'::timestamptz),
  ('project:paata-ai', 'PAY-PAATA-03', 1000000::bigint, '2024-01-10'::timestamptz),
  ('project:paata-ai', 'PAY-PAATA-04', 1164000::bigint, '2024-02-20'::timestamptz),
  ('project:paata-ai', 'PAY-PAATA-05', 4366000::bigint, '2024-04-05'::timestamptz),
  ('project:paata-ai', 'PAY-PAATA-06', 4366000::bigint, '2024-05-15'::timestamptz),
  ('project:paata-ai', 'PAY-PAATA-07', 3580000::bigint, '2024-06-20'::timestamptz),
  ('project:masako-india', 'PAY-MASAKO-01', 4600000::bigint, '2024-03-01'::timestamptz),
  ('project:lifxel', 'PAY-LIFXEL-01', 24000000::bigint, '2024-08-01'::timestamptz),
  ('project:blaaze', 'PAY-BLAAZE-01', 5000000::bigint, '2024-05-01'::timestamptz),
  ('project:marketplace-analytics', 'PAY-MPA-01', 30500000::bigint, '2024-09-01'::timestamptz),
  ('project:young-boy-toyz', 'PAY-YBT-01', 3000000::bigint, '2024-07-01'::timestamptz),
  ('project:sanveda-ngo', 'PAY-SANVEDA-01', 750000::bigint, '2025-03-15'::timestamptz),
  ('project:treadtrails', 'PAY-TT-ADVANCE', 4130000::bigint, '2025-04-10'::timestamptz),
  ('project:treadtrails', 'PAY-TT-BACKEND', 1652000::bigint, '2025-05-20'::timestamptz),
  ('project:treadtrails', 'PAY-TT-BUILD', 1652000::bigint, '2025-06-10'::timestamptz)
) AS v(project_key, invoice_number, amount_cents, paid_at)
JOIN projects p ON p.import_key = v.project_key
JOIN clients c ON c.id = p.client_id
WHERE NOT EXISTS (
  SELECT 1 FROM invoices i WHERE i.project_id = p.id
);

-- ─── Milestones (TreadTrails + Sanveda) ───

INSERT INTO milestones (project_id, title, description, completion_pct, status, completed_at, "createdAt")
SELECT p.id, v.title, v.description, v.completion_pct, v.status, v.completed_at, NOW()
FROM (VALUES
  ('project:treadtrails', 'Advance (50%)', 'Project kickoff and advance payment', 50, 'completed', '2025-04-10'::timestamptz),
  ('project:treadtrails', 'Backend (20%)', 'Backend development and API setup', 20, 'completed', '2025-05-20'::timestamptz),
  ('project:treadtrails', 'Full Build (20%)', 'Frontend and full build completion', 20, 'completed', '2025-06-10'::timestamptz),
  ('project:treadtrails', 'Handover (10%)', 'Final handover, documentation, and deployment', 10, 'pending', NULL::timestamptz),
  ('project:sanveda-ngo', 'Public Website', 'NGO public website development', 50, 'in_progress', NULL::timestamptz),
  ('project:sanveda-ngo', 'NGO OS', 'NGO operations system', 0, 'pending', NULL::timestamptz)
) AS v(project_key, title, description, completion_pct, status, completed_at)
JOIN projects p ON p.import_key = v.project_key
WHERE NOT EXISTS (
  SELECT 1 FROM milestones m WHERE m.project_id = p.id
);

-- ─── Seed activity timeline for historical projects ───

INSERT INTO project_activity (project_id, event_type, title, description, created_at)
SELECT p.id, 'imported', 'Historical project imported', 'Pre-populated from Curvvtech project records. All fields remain editable.', p."createdAt"
FROM projects p
WHERE p.import_key LIKE 'project:%'
  AND NOT EXISTS (
    SELECT 1 FROM project_activity a WHERE a.project_id = p.id AND a.event_type = 'imported'
  );
