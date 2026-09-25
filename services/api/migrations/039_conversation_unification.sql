-- Client Portal — Phase 5: Conversation unification.
-- One engine for website chat, portal chat, and future channels.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations (id),
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'website';  -- website | portal | whatsapp | email | instagram

DO $$
DECLARE curvv UUID;
BEGIN
  SELECT id INTO curvv FROM organizations WHERE slug = 'curvvtech' LIMIT 1;
  UPDATE conversations SET organization_id = curvv WHERE organization_id IS NULL;
END $$;

UPDATE conversations c
SET organization_id = cl.organization_id
FROM clients cl
WHERE c.client_id = cl.id AND c.organization_id IS DISTINCT FROM cl.organization_id;

CREATE INDEX IF NOT EXISTS idx_conversations_client
  ON conversations (client_id, "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_project
  ON conversations (project_id);
