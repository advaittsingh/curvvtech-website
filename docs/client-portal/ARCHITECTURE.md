# Client Portal — Architecture Specification

**Status:** Draft v1.0 — frozen contract  
**Audience:** Engineering  
**Principle:** The portal holds no business logic. It exposes selected, whitelisted admin data over a client-scoped API.

> **Do not build portal UI until this contract is implemented.**  
> **Do not reuse `/api/admin/*` from the portal.**  
> **Do not share auth middleware with admin.**

---

## 0. Scope & boundaries

### What this document covers

The **Client Portal** — the customer-facing surface at `client.curvvtech.com` (or white-label domains) where Curvvtech clients log in to view projects, pay invoices, download deliverables, approve work, and message support.

### What this document does NOT cover

| System | Namespace | Purpose |
|---|---|---|
| Curvvtech Admin | `/api/admin/*` | Internal staff OS (existing) |
| Business OS product | `/api/bos/v1/*`, `bos_*` tables | AI-employee SaaS for external businesses (separate product) |
| FollowUp | `/api/v1/*` | WhatsApp CRM SaaS (separate product) |

The Client Portal is built on **existing Curvvtech admin tables** (`clients`, `projects`, `invoices`, `files`, `conversations`, etc.) — not on `bos_*`. The `bos_organizations` model is a parallel product tenant; do not merge them in Phase 0–5.

### Architectural fork (decision locked)

```
Curvvtech monorepo
│
├── Admin Portal          admin.curvvtech.com     → /api/admin/*
├── Client Portal         client.curvvtech.com    → /api/client/*     ← THIS SPEC
├── Business OS product   businessos.curvvtech.com → /api/bos/v1/*    (separate)
└── FollowUp              app.followup.com        → /api/v1/*         (separate)
```

All three products may share Express infrastructure and S3, but **never share auth middleware, JWT secrets, or route handlers**.

---

## 1. Database additions & migrations

Migrations live in `services/api/migrations/`. Next file: **`034_client_portal_foundation.sql`**.

Convention for **new tables**: snake_case columns, `created_at` / `updated_at`.  
Convention for **ALTER on existing Curvvtech tables**: snake_case new columns (matches `portal_status`, `progress_pct`, etc.). Existing timestamp columns remain quoted camelCase `"createdAt"` / `"updatedAt"` — always quote in SQL.

### 1.1 Migration `034` — Organization tenant layer

Introduce the agency/workspace tenant. Curvvtech is Tenant #1. Future white-label agencies (e.g. Acme Digital) are additional rows.

```sql
-- Agency / workspace (NOT bos_organizations)
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active',
  branding_json   JSONB NOT NULL DEFAULT '{}',
  -- { logo_url, favicon_url, brand_color, accent_color, text_color, company_name }
  domain_json     JSONB NOT NULL DEFAULT '{}',
  -- { portal_domain, admin_domain, email_from, smtp: { host, port, user, pass_encrypted } }
  settings_json   JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Curvvtech as org #1 (idempotent)
INSERT INTO organizations (name, slug, branding_json)
SELECT 'Curvvtech', 'curvvtech', '{"brand_color":"#111111"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'curvvtech');

-- Backfill organization_id on core tables (nullable first, then NOT NULL after backfill)
ALTER TABLE clients  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE files    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE tasks    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

UPDATE clients  SET organization_id = (SELECT id FROM organizations WHERE slug = 'curvvtech' LIMIT 1)
  WHERE organization_id IS NULL;
UPDATE projects SET organization_id = (SELECT id FROM organizations WHERE slug = 'curvvtech' LIMIT 1)
  WHERE organization_id IS NULL;
UPDATE invoices SET organization_id = (SELECT id FROM organizations WHERE slug = 'curvvtech' LIMIT 1)
  WHERE organization_id IS NULL;
UPDATE files    SET organization_id = (SELECT id FROM organizations WHERE slug = 'curvvtech' LIMIT 1)
  WHERE organization_id IS NULL;
UPDATE tasks    SET organization_id = (SELECT id FROM organizations WHERE slug = 'curvvtech' LIMIT 1)
  WHERE organization_id IS NULL;

-- Link existing company_settings to org (single row today)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE company_settings SET organization_id = (SELECT id FROM organizations WHERE slug = 'curvvtech' LIMIT 1)
  WHERE organization_id IS NULL;
```

**`branding_json` shape (frozen):**

```typescript
type OrganizationBranding = {
  logo_url?: string
  favicon_url?: string
  brand_color?: string      // primary
  accent_color?: string
  text_color?: string
  company_name?: string
}
```

**`domain_json` shape (frozen):**

```typescript
type OrganizationDomain = {
  portal_domain?: string    // e.g. portal.acmedigital.com
  admin_domain?: string     // e.g. admin.acmedigital.com
  email_from?: string
  smtp?: {
    host: string
    port: number
    user: string
    pass_encrypted: string  // AES-256, key in AWS Secrets Manager
  }
}
```

### 1.2 Migration `035` — Client identity

Completely separate from `users` (staff). Client users authenticate with their own JWT secret.

```sql
CREATE TABLE IF NOT EXISTS client_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT,                    -- null until invite accepted
  name            TEXT NOT NULL DEFAULT '',
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'viewer',
  -- owner | manager | finance | viewer
  status          TEXT NOT NULL DEFAULT 'invited',
  -- invited | active | suspended
  invite_token    TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE INDEX idx_client_users_client ON client_users (client_id);
CREATE INDEX idx_client_users_email ON client_users (organization_id, email);

CREATE TABLE IF NOT EXISTS client_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id  UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent      TEXT,
  ip_address      TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_sessions_user ON client_sessions (client_user_id)
  WHERE revoked_at IS NULL;
```

**Role → permission matrix (hardcoded in TS, same pattern as admin):**

| Permission | Owner | Manager | Finance | Viewer |
|---|:---:|:---:|:---:|:---:|
| `portal.dashboard.view` | ✓ | ✓ | ✓ | ✓ |
| `portal.projects.view` | ✓ | ✓ | ✓ | ✓ |
| `portal.tasks.view` | ✓ | ✓ | ✓ | ✓ |
| `portal.tasks.complete` | ✓ | ✓ | — | — |
| `portal.files.view` | ✓ | ✓ | ✓ | ✓ |
| `portal.files.upload` | ✓ | ✓ | — | — |
| `portal.invoices.view` | ✓ | ✓ | ✓ | — |
| `portal.invoices.pay` | ✓ | — | ✓ | — |
| `portal.approvals.act` | ✓ | ✓ | — | — |
| `portal.revisions.request` | ✓ | ✓ | — | — |
| `portal.support.message` | ✓ | ✓ | ✓ | ✓ |
| `portal.team.manage` | ✓ | — | — | — |
| `portal.profile.edit` | ✓ | ✓ | ✓ | ✓ |

Store in `services/api/src/lib/clientPermissions.ts` (mirror of `adminPermissions.ts`).

### 1.3 Migration `036` — Visibility & publishing

Standardized visibility enum on every entity the portal may expose.

```sql
-- Reusable enum
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

-- Milestones
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

-- Invoices: visibility derived from status (sent/viewed/paid/overdue = client-visible)
-- No column needed — gate in service layer:
--   status IN ('sent','viewed','paid','overdue','partial') → client can see

-- Updates table already has visibility TEXT ('internal' | 'client') — migrate to enum later
-- For now, treat visibility='client' as equivalent to visibility_level='client'
```

**Publish workflow (frozen):**

```
Staff uploads / creates entity
        │
        ▼
visibility = 'internal'   (default)
        │
        ▼
PM reviews in admin
        │
        ▼
POST /api/admin/files/:id/publish
  → visibility = 'client'
  → published_at = now()
  → published_by_user_id = req.auth.sub
  → emit activity_event('file.published', ...)
        │
        ▼
Client portal query:
  WHERE visibility = 'client' AND client_id = ctx.client_id
```

### 1.4 Migration `037` — Activity / timeline engine

One event stream powers admin feeds, client timelines, notifications, AI context, and audit logs.

```sql
CREATE TABLE IF NOT EXISTS activity_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Who did it
  actor_type      TEXT NOT NULL,
  -- 'staff' | 'client' | 'system' | 'ai'
  actor_id        TEXT,           -- users.id or client_users.id
  actor_name      TEXT,           -- denormalized for display

  -- What happened
  event_type      TEXT NOT NULL,
  -- see Event Catalog below
  entity_type     TEXT,           -- 'project' | 'invoice' | 'file' | 'milestone' | ...
  entity_id       UUID,

  -- Display
  title           TEXT NOT NULL,
  body            TEXT,
  metadata_json   JSONB NOT NULL DEFAULT '{}',

  -- Visibility
  visibility      visibility_level NOT NULL DEFAULT 'internal',
  -- 'client' events appear in portal timeline; 'internal' only in admin

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_events_client ON activity_events (client_id, created_at DESC)
  WHERE visibility = 'client';
CREATE INDEX idx_activity_events_project ON activity_events (project_id, created_at DESC);
CREATE INDEX idx_activity_events_org ON activity_events (organization_id, created_at DESC);
CREATE INDEX idx_activity_events_type ON activity_events (event_type, created_at DESC);
```

**Event catalog (starter — extend as modules ship):**

```
# CRM
lead.created | lead.converted | client.created | client.archived

# Projects
project.created | project.status_changed | project.progress_updated
milestone.created | milestone.completed | milestone.published
task.created | task.completed | task.published

# Files
file.uploaded | file.published | file.downloaded

# Finance
invoice.created | invoice.sent | invoice.viewed | invoice.paid | invoice.overdue
payment.received

# Proposals
proposal.sent | proposal.viewed | proposal.approved | proposal.rejected

# Approvals
approval.requested | approval.approved | approval.rejected | approval.commented

# Revisions
revision.requested | revision.approved | revision.completed

# Support
conversation.started | conversation.escalated | conversation.closed
message.sent | message.ai_replied

# Meetings
meeting.scheduled | meeting.completed | meeting.cancelled

# System
client.invited | client.logged_in | file.downloaded_by_client
```

**Emit pattern (frozen):**

```typescript
// services/api/src/modules/shared/activity/emitActivityEvent.ts
export async function emitActivityEvent(input: {
  organizationId: string
  clientId?: string
  projectId?: string
  actorType: 'staff' | 'client' | 'system' | 'ai'
  actorId?: string
  actorName?: string
  eventType: string
  entityType?: string
  entityId?: string
  title: string
  body?: string
  metadata?: Record<string, unknown>
  visibility?: 'internal' | 'client' | 'private'
}): Promise<void>
```

Every admin mutation that matters calls `emitActivityEvent`. The notification worker subscribes to new rows.

### 1.5 Migration `038` — Client notifications

```sql
CREATE TABLE IF NOT EXISTS client_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_user_id  UUID REFERENCES client_users(id) ON DELETE CASCADE,
  -- null = broadcast to all users on the client account
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  type            TEXT NOT NULL,
  -- 'invoice' | 'task' | 'approval' | 'message' | 'meeting' | 'file' | 'system'
  title           TEXT NOT NULL,
  body            TEXT NOT NULL DEFAULT '',
  action_json     JSONB NOT NULL DEFAULT '{}',
  -- { route: '/billing/invoices/:id', label: 'View invoice' }

  read_at         TIMESTAMPTZ,
  activity_event_id UUID REFERENCES activity_events(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notifications_user ON client_notifications (client_user_id, created_at DESC)
  WHERE read_at IS NULL;
```

Notification creation is triggered by `activity_events` insert (worker or inline for MVP).

### 1.6 Migration `039` — Conversation unification (Inbox)

Extend existing `conversations` table to link to clients and projects. One engine for website chat, portal chat, and future channels.

```sql
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'website';
  -- 'website' | 'portal' | 'whatsapp' | 'email' | 'instagram'

-- Backfill org from client
UPDATE conversations c
SET organization_id = cl.organization_id
FROM clients cl
WHERE c.client_id = cl.id AND c.organization_id IS NULL;

CREATE INDEX idx_conversations_client ON conversations (client_id, "updatedAt" DESC);
CREATE INDEX idx_conversations_project ON conversations (project_id);
```

Portal conversations: `channel = 'portal'`, `client_id` set, `source = 'portal'`.

### 1.7 Migration `040` — Meetings, approvals, feedback (new modules)

```sql
CREATE TABLE IF NOT EXISTS meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  meet_url        TEXT,
  recording_url   TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  -- scheduled | completed | cancelled
  visibility      visibility_level NOT NULL DEFAULT 'client',
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL,
  -- 'milestone' | 'revision' | 'file' | 'change_order' | 'design' | 'invoice'
  entity_id       UUID NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  -- pending | approved | rejected
  decided_by      UUID REFERENCES client_users(id),
  decided_at      TIMESTAMPTZ,
  comment         TEXT,
  visibility      visibility_level NOT NULL DEFAULT 'client',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  rating          INT CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  context         TEXT,
  -- 'project_completion' | 'milestone' | 'support' | 'general'
  created_by      UUID REFERENCES client_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 2. Client authentication & authorization

### 2.1 Separate auth stack

| Concern | Admin | Client Portal |
|---|---|---|
| Domain | `admin.curvvtech.com` | `client.curvvtech.com` |
| API prefix | `/api/admin/*` | `/api/client/*` |
| JWT secret | `JWT_SECRET` | `CLIENT_JWT_SECRET` (new env var) |
| Token claim `typ` | — | `"client"` (reject admin tokens) |
| User table | `users` + `curvvtech_role` | `client_users` + `role` |
| Middleware | `requireCurvvtechAdmin` | `requireClientAuth` (new) |
| Session table | `admin_sessions` (display only) | `client_sessions` |
| Refresh token | `users.refresh_token_hash` | `client_sessions.refresh_token_hash` |

### 2.2 JWT shape

```typescript
// Access token (15 min)
{
  sub: client_users.id,       // UUID
  email: string,
  typ: 'client',              // REQUIRED — middleware rejects without it
  org_id: organizations.id,
  client_id: clients.id,
  role: 'owner' | 'manager' | 'finance' | 'viewer'
}

// Refresh token: opaque, stored hashed in client_sessions
// Format: {clientUserId}.{randomBytes(32).hex}
```

Sign with `CLIENT_JWT_SECRET`, algorithm HS256, same pattern as `auth.tokens.ts`.

### 2.3 Middleware chain

```
/api/client/*
  → requireClientAuth          // verify JWT, typ='client', load client_users row
  → resolveClientPortalContext // set req.portalCtx (see below)
  → enforceClientPermissions   // route-prefix → permission (mirror admin pattern)
```

**`req.portalCtx` (frozen):**

```typescript
type ClientPortalContext = {
  organizationId: string
  clientId: string           // NEVER from request body/params
  clientUserId: string
  role: ClientRole
  permissions: ClientPermission[]
  branding: OrganizationBranding  // loaded once per request from organizations.branding_json
}
```

### 2.4 Tenant resolution rule (frozen)

> **No client portal endpoint accepts `client_id` from the frontend.**

Every query appends:

```sql
WHERE client_id = $ctx.client_id
  AND organization_id = $ctx.organization_id
```

For project-scoped routes (`/projects/:projectId/...`), additionally verify:

```sql
AND EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = $projectId
    AND p.client_id = $ctx.client_id
    AND p.organization_id = $ctx.organization_id
)
```

Return **404** (not 403) when a resource exists but belongs to another client — prevents enumeration.

### 2.5 Invite & onboarding flow

```
Admin: POST /api/admin/clients/:id/invite-portal
  → create client_users (status='invited', role='owner')
  → generate invite_token (crypto.randomBytes(32).hex)
  → send email with link: https://client.curvvtech.com/invite/:token
  → emit activity_event('client.invited')
  → update clients.portal_status = 'invited'

Client: POST /api/client/auth/accept-invite
  body: { token, password, name }
  → validate token + expiry
  → set password_hash, status='active', clear invite_token
  → update clients.portal_status = 'active', portal_last_login_at = now()
  → return access + refresh tokens
```

---

## 3. API separation — `/api/client/*`

Mount in `services/api/src/app.ts`:

```typescript
app.use('/api/client', clientRouter)   // NEW
app.use('/api/admin', adminRouter)     // existing
```

Client router: `services/api/src/modules/client-portal/index.ts`

### 3.1 Route map (frozen contract)

```
# Auth (no requireClientAuth)
POST   /api/client/auth/login
POST   /api/client/auth/refresh
POST   /api/client/auth/logout
POST   /api/client/auth/accept-invite
POST   /api/client/auth/forgot-password
POST   /api/client/auth/reset-password

# Branding (no auth — resolved by Host header for white-label)
GET    /api/client/branding

# Dashboard
GET    /api/client/dashboard

# Projects
GET    /api/client/projects
GET    /api/client/projects/:projectId
GET    /api/client/projects/:projectId/timeline
GET    /api/client/projects/:projectId/milestones
GET    /api/client/projects/:projectId/tasks
GET    /api/client/projects/:projectId/scope
GET    /api/client/projects/:projectId/activity
GET    /api/client/projects/:projectId/files
GET    /api/client/projects/:projectId/revisions
GET    /api/client/projects/:projectId/team

# Tasks
PATCH  /api/client/tasks/:taskId          # mark complete (if assigned + visible)

# Files
GET    /api/client/files/:fileId/download-url
POST   /api/client/files/upload-url         # scoped to client's project inbox folder
POST   /api/client/files/:fileId/confirm    # after S3 PUT succeeds

# Billing
GET    /api/client/invoices
GET    /api/client/invoices/:invoiceId
GET    /api/client/invoices/:invoiceId/pdf
POST   /api/client/invoices/:invoiceId/pay  # create Razorpay order
POST   /api/client/invoices/:invoiceId/verify-payment
GET    /api/client/payments                 # payment history

# Proposals
GET    /api/client/proposals
GET    /api/client/proposals/:proposalId
POST   /api/client/proposals/:proposalId/approve
POST   /api/client/proposals/:proposalId/reject

# Approvals
GET    /api/client/approvals
GET    /api/client/approvals/:approvalId
POST   /api/client/approvals/:approvalId/decide   # { decision: 'approved'|'rejected', comment? }

# Revisions
POST   /api/client/projects/:projectId/revisions  # request revision

# Support (Inbox)
GET    /api/client/conversations
POST   /api/client/conversations                # start new (channel='portal')
GET    /api/client/conversations/:id
GET    /api/client/conversations/:id/messages
POST   /api/client/conversations/:id/messages
POST   /api/client/conversations/:id/mark-read

# Notifications
GET    /api/client/notifications
POST   /api/client/notifications/mark-read
POST   /api/client/notifications/:id/read

# Meetings
GET    /api/client/meetings

# Feedback
POST   /api/client/feedback

# Profile & team
GET    /api/client/profile
PATCH  /api/client/profile
POST   /api/client/profile/change-password
GET    /api/client/team                     # client_users on same client_id (owner only)
POST   /api/client/team/invite
DELETE /api/client/team/:userId

# AI assistant
POST   /api/client/ai/chat                    # project-context assistant
```

### 3.2 Permission enforcement map

```typescript
// services/api/src/middleware/enforceClientPermissions.ts
const CLIENT_RULES = [
  { prefix: '/dashboard',           view: 'portal.dashboard.view' },
  { prefix: '/projects',            view: 'portal.projects.view' },
  { prefix: '/tasks',                view: 'portal.tasks.view', edit: 'portal.tasks.complete' },
  { prefix: '/files',                view: 'portal.files.view', edit: 'portal.files.upload' },
  { prefix: '/invoices',            view: 'portal.invoices.view', edit: 'portal.invoices.pay' },
  { prefix: '/payments',             view: 'portal.invoices.view' },
  { prefix: '/proposals',            view: 'portal.projects.view', edit: 'portal.approvals.act' },
  { prefix: '/approvals',            view: 'portal.approvals.act', edit: 'portal.approvals.act' },
  { prefix: '/conversations',        view: 'portal.support.message', edit: 'portal.support.message' },
  { prefix: '/notifications',       view: 'portal.dashboard.view' },
  { prefix: '/meetings',             view: 'portal.projects.view' },
  { prefix: '/feedback',             view: 'portal.dashboard.view' },
  { prefix: '/profile',              view: 'portal.profile.edit', edit: 'portal.profile.edit' },
  { prefix: '/team',                 view: 'portal.team.manage', edit: 'portal.team.manage' },
  { prefix: '/ai',                   view: 'portal.support.message' },
]
```

---

## 4. Shared service layer & DTOs

### 4.1 Directory structure

```
services/api/src/modules/shared/
├── activity/
│   └── emitActivityEvent.ts
├── projects/
│   ├── ProjectService.ts          # getById, listForClient, getTimeline, getMilestones
│   └── project.dto.ts             # toAdminProject(), toClientProject()
├── invoices/
│   ├── InvoiceService.ts
│   └── invoice.dto.ts
├── files/
│   ├── FileService.ts
│   └── file.dto.ts
├── tasks/
│   ├── TaskService.ts
│   └── task.dto.ts
├── conversations/
│   ├── ConversationService.ts
│   └── conversation.dto.ts
├── notifications/
│   └── NotificationService.ts
└── organizations/
    └── OrganizationService.ts     # resolveByDomain, getBranding
```

### 4.2 DTO pattern (frozen)

Never return raw DB rows to either API. Always serialize through DTO functions.

```typescript
// Example: project.dto.ts
export function toClientProject(row: ProjectRow): ClientProjectDTO {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    progress_pct: row.progress_pct,
    current_phase: row.current_phase,
    target_end_date: row.target_end_date,
    live_url: row.live_url,
    // STRIPPED: internal_notes, budget_cents, quoted_cents, gst_cents,
    //           manager_user_id, metadata, ai_intelligence, is_internal
  }
}

export function toAdminProject(row: ProjectRow): AdminProjectDTO {
  return { ...row }  // full fields
}
```

**Fields NEVER exposed to client (frozen denylist):**

```
internal_notes, budget_cents, quoted_cents, gst_cents, cost_cents,
manager_user_id, ai_intelligence, analyzed_at, metadata,
is_internal, import_key, referred_by, api_keys_json, database_info,
env_notes, health_score, contract_value_cents, account_manager_id,
assigned_to_clerk_id, score, probability, deal_value_cents
```

### 4.3 Service scoping (frozen)

Every service method that serves the client API accepts `ctx: ClientPortalContext` as first argument:

```typescript
class ProjectService {
  async listForClient(ctx: ClientPortalContext): Promise<ClientProjectDTO[]> {
    const rows = await sql`
      SELECT id, name, status, progress_pct, current_phase, target_end_date, live_url
      FROM projects
      WHERE client_id = ${ctx.clientId}
        AND organization_id = ${ctx.organizationId}
        AND is_internal = false
        AND deleted_at IS NULL
      ORDER BY "updatedAt" DESC
    `
    return rows.map(toClientProject)
  }
}
```

Admin controllers call the same service without `ctx`, passing explicit filters instead.

---

## 5. Event, notification & real-time architecture

### 5.1 Event → notification pipeline

```
Domain mutation (admin or client)
        │
        ▼
emitActivityEvent({ visibility: 'client', ... })
        │
        ├──► activity_events row (timeline + audit)
        │
        └──► NotificationService.createFromEvent()
                  │
                  ├──► client_notifications row (in-app bell)
                  │
                  └──► EmailService.send() (if configured)
                         uses organizations.domain_json.smtp
```

### 5.2 Real-time (Socket.IO)

Reuse existing infrastructure. Extend room naming:

| Room | Members | Purpose |
|---|---|---|
| `conversation:{id}` | Client + staff in that conversation | Chat messages (existing) |
| `client:{clientId}` | All client_users for that client | Notifications, activity |
| `project:{projectId}` | Client + staff on project | Milestone/task updates |

**Client socket auth (new):**

```typescript
// Handshake: { token: clientAccessToken }
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token
  const claims = verifyClientAccessToken(token)
  if (claims.typ !== 'client') return next(new Error('Unauthorized'))
  socket.data.portalCtx = claims
  socket.join(`client:${claims.client_id}`)
  next()
})
```

**Events emitted to client rooms:**

```typescript
'notification'     // new client_notifications row
'activity'         // new activity_events row (visibility='client')
'chat_message'       // existing — conversation:{id}
'project_updated'    // progress/status change
'milestone_completed'
'invoice_paid'
```

### 5.3 Email service (new, minimal)

```typescript
// services/api/src/modules/shared/communications/EmailService.ts
export async function sendClientEmail(opts: {
  organizationId: string
  to: string
  subject: string
  html: string
}): Promise<void>
```

Resolves SMTP from `organizations.domain_json.smtp`. Falls back to `company_settings` SMTP for org #1. No-op with log warning if unconfigured (never throw on missing SMTP).

---

## 6. File access & signed URL strategy

### 6.1 S3 key namespaces (frozen)

| Namespace | Pattern | Who uploads |
|---|---|---|
| Admin files | `admin/{staffUserId}/{uuid}/{version}/{name}` | Staff (existing) |
| Client uploads | `client/{clientId}/{projectId}/{uuid}/{name}` | Client portal |
| Deliverables | `admin/{staffUserId}/{uuid}/{version}/{name}` | Staff, published to client |

### 6.2 New presign functions

```typescript
// services/api/src/services/s3Presign.ts (extend existing)

export async function presignClientFileUpload(opts: {
  clientId: string
  projectId: string
  fileName: string
  contentType: string
}): Promise<{ url: string; key: string; expiresIn: number } | null>

export async function presignClientFileDownload(opts: {
  key: string
  clientId: string
  fileId: string
}): Promise<{ url: string; expiresIn: number } | null>
```

### 6.3 Download authorization flow

```
Client: GET /api/client/files/:fileId/download-url
        │
        ▼
FileService.getForClient(ctx, fileId)
  → SELECT FROM files
    WHERE id = $fileId
      AND client_id = $ctx.clientId
      AND visibility = 'client'
        │
        ▼
presignClientFileDownload({ key, clientId, fileId })
        │
        ▼
emitActivityEvent('file.downloaded_by_client', visibility='internal')
        │
        ▼
Return { url, expires_in: 900 }
```

### 6.4 Upload flow (client → inbox folder)

```
Client: POST /api/client/files/upload-url
  body: { project_id, file_name, content_type, size_bytes }
        │
        ▼
Validate project belongs to ctx.clientId
Validate size_bytes <= 50MB
        │
        ▼
presignClientFileUpload → S3 PUT URL
INSERT files (visibility='internal', s3_key=..., client_id, project_id)
        │
        ▼
Client: PUT to S3
Client: POST /api/client/files/:fileId/confirm
  → verify S3 object exists (HeadObject)
  → emit activity_event('file.uploaded')
  → notify staff (internal notification)
```

Staff reviews in admin → publishes → client sees it.

---

## 7. Payment reconciliation (required before Billing slice)

### 7.1 Current state (broken)

- `POST /api/admin/invoices/:id/payment-link` creates Razorpay order, stores `razorpay_order_id`
- `POST /payments/verify-payment` validates HMAC but **never marks invoice paid**
- No webhook for invoice payments (FollowUp subscription webhook is unrelated)

### 7.2 Required wiring (frozen)

```
Client: POST /api/client/invoices/:id/pay
  → InvoiceService.createPaymentOrder(ctx, invoiceId)
  → createRazorpayOrder({ amount, receipt: invoice.id, notes: { invoice_id } })
  → return { order_id, amount, currency, key_id }

Client: Razorpay checkout modal → payment success
Client: POST /api/client/invoices/:id/verify-payment
  body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        │
        ▼
verifyRazorpayPaymentSignature(orderId, paymentId, signature)
        │
        ▼
InvoiceService.markPaid(invoiceId, {
  razorpay_payment_id,
  razorpay_order_id,
  paid_at: now(),
  paid_by: ctx.clientUserId
})
  → UPDATE invoices SET status='paid', paid_at=now()
  → emit activity_event('invoice.paid', visibility='client')
  → NotificationService → client + staff
  → runCurvvtechWorkflows({ trigger_type: 'invoice_paid' })  // existing automations
```

### 7.3 Webhook (recommended, add in Phase 2)

```
POST /api/client/billing/webhooks/razorpay
  → verify x-razorpay-signature against CLIENT_RAZORPAY_WEBHOOK_SECRET
  → on payment.captured: InvoiceService.markPaid(...)
```

Idempotent: check `invoices.status` before updating.

---

## 8. AI client assistant context

### 8.1 Context builder

```typescript
// services/api/src/modules/client-portal/ai/ClientContextBuilder.ts

export async function buildClientAiContext(ctx: ClientPortalContext, projectId?: string) {
  return {
    client: await ClientService.getProfile(ctx),
    projects: projectId
      ? [await ProjectService.getForClient(ctx, projectId)]
      : await ProjectService.listForClient(ctx),
    milestones: projectId ? await ProjectService.getMilestones(ctx, projectId) : [],
    tasks: projectId ? await TaskService.listForClient(ctx, projectId) : [],
    invoices: await InvoiceService.listForClient(ctx),
    files: projectId ? await FileService.listForClient(ctx, projectId) : [],
    timeline: projectId ? await ActivityService.getProjectTimeline(ctx, projectId) : [],
    meetings: await MeetingService.listForClient(ctx),
    scope: projectId ? await ProjectService.getScope(ctx, projectId) : [],
  }
}
```

### 8.2 Endpoint

```
POST /api/client/ai/chat
body: { message: string, project_id?: string }
  → buildClientAiContext(ctx, project_id)
  → system prompt with context JSON
  → OpenAI completion (reuse aiService patterns)
  → return { reply, actions?: [{ type: 'open_invoice', id }] }
```

Actions array lets the AI trigger UI navigation ("Show invoice" → `{ type: 'navigate', route: '/billing/invoices/:id' }`).

---

## 9. White-label organization model

### 9.1 Resolution

```
Request to client.acmedigital.com
        │
        ▼
GET /api/client/branding (no auth)
  → OrganizationService.resolveByDomain(host)
  → SELECT FROM organizations WHERE domain_json->>'portal_domain' = $host
  → return branding_json (logo, colors, company_name)
        │
        ▼
Portal frontend applies CSS variables from branding
```

For `client.curvvtech.com` (no custom domain), fall back to org slug `curvvtech`.

### 9.2 Admin management

Extend `Company Settings` page to edit `organizations.branding_json` and `domain_json` for the current org. No UI changes needed for Phase 0 — seed data is sufficient.

### 9.3 What moves from `company_settings` → `organizations`

| Field | Today | Future |
|---|---|---|
| `company_name` | `company_settings` | `organizations.branding_json.company_name` |
| `logo_url` | `company_settings` | `organizations.branding_json.logo_url` |
| `brand_color` | `company_settings` | `organizations.branding_json.brand_color` |
| `email_from`, `smtp_*` | `company_settings` | `organizations.domain_json` |
| Bank details, GST, PAN | `company_settings` | Stay (used for invoice PDF generation) |

Migration path: read from `organizations` first, fall back to `company_settings` for org #1 during transition.

---

## 10. Implementation phases (execution order)

### Phase 0 — Portal infrastructure (1–2 days)

**Goal:** Client can accept an invite, log in, and see an empty dashboard.

- [ ] Migration `034` — organizations + backfill
- [ ] Migration `035` — client_users, client_sessions
- [ ] `CLIENT_JWT_SECRET` env var
- [ ] `requireClientAuth` + `resolveClientPortalContext` + `enforceClientPermissions`
- [ ] `clientPermissions.ts` role matrix
- [ ] `POST /api/client/auth/*` (login, refresh, logout, accept-invite)
- [ ] `GET /api/client/branding`
- [ ] `GET /api/client/dashboard` (stub — returns client name + empty widgets)
- [ ] Admin: wire `POST /api/admin/clients/:id/invite-portal` (replace stub)
- [ ] Scaffold `apps/client-portal/` (Next.js 15, auth pages only)

**Exit criteria:** Admin invites client → client sets password → logs in → sees branded empty dashboard.

### Phase 1 — Tenant layer + activity engine (1 day)

- [ ] Migration `037` — activity_events
- [ ] Migration `038` — client_notifications
- [ ] `emitActivityEvent()` + wire into existing admin mutations (projects, invoices, files, milestones)
- [ ] `NotificationService.createFromEvent()`
- [ ] `GET /api/client/notifications`
- [ ] Socket.IO: `client:{clientId}` room + `notification` event

**Exit criteria:** Admin marks milestone complete → client sees activity event + notification.

### Phase 2 — Visibility + publish workflow (1 day)

- [ ] Migration `036` — visibility columns
- [ ] `POST /api/admin/files/:id/publish` (and milestones, tasks, revisions)
- [ ] Admin UI: "Publish to client" button on file/milestone panels
- [ ] All client queries filter `visibility = 'client'`

**Exit criteria:** Staff uploads file (internal) → publishes → client sees it in portal.

### Phase 3 — Shared services + client project API (2 days)

- [ ] `ProjectService`, `TaskService`, `FileService`, `InvoiceService` in `modules/shared/`
- [ ] DTO serializers (`toClientProject`, etc.)
- [ ] Client routes: projects, tasks, files, scope, timeline, activity, team
- [ ] S3: `presignClientFileUpload`, `presignClientFileDownload`
- [ ] Payment reconciliation: `InvoiceService.markPaid` + verify endpoint

**Exit criteria:** Client logs in → sees projects with progress → downloads a published file → views scope.

### Phase 4 — Portal vertical slices (UI, in order)

Build UI only after Phases 0–3 are deployed.

| Slice | Portal screens | Depends on |
|---|---|---|
| 4a | Auth, Dashboard, Profile | Phase 0 |
| 4b | Projects (overview, timeline, milestones, tasks, scope, activity) | Phase 3 |
| 4c | Documents (files, deliverables) | Phase 2 + 3 |
| 4d | Billing (invoices, payments, Pay Now) | Phase 3 + reconciliation |
| 4e | Inbox (support chat) | Phase 0 + conversation unification (`039`) |
| 4f | Approvals (design, revisions, requirements) | Phase 2 + `040` |
| 4g | Meetings | `040` |
| 4h | AI assistant | Phase 3 context builder |

### Phase 5 — Conversation unification (parallel with 4e)

- [ ] Migration `039` — conversation client/project links
- [ ] Portal chat creates `channel='portal'` conversations
- [ ] AI context includes project data
- [ ] Socket auth for client tokens

### Phase 6 — White-label domains (when needed)

- [ ] DNS + SSL for custom portal domains
- [ ] `OrganizationService.resolveByDomain()`
- [ ] Admin UI for branding/domain settings
- [ ] Email templates with org branding

---

## 11. Environment variables (new)

```bash
# Client portal auth (REQUIRED)
CLIENT_JWT_SECRET=           # separate from JWT_SECRET
CLIENT_JWT_ACCESS_EXPIRES_SEC=900       # 15 min
CLIENT_JWT_REFRESH_EXPIRES_SEC=2592000    # 30 days

# Client portal URLs
CLIENT_PORTAL_URL=https://client.curvvtech.com
CLIENT_INVITE_FROM_EMAIL=noreply@curvvtech.com

# Razorpay (client billing — may share keys with admin)
CLIENT_RAZORPAY_WEBHOOK_SECRET=   # for invoice payment webhook

# Existing (unchanged)
JWT_SECRET=                  # admin only
S3_BUCKET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

---

## 12. Security checklist

- [ ] `CLIENT_JWT_SECRET` ≠ `JWT_SECRET`
- [ ] Client JWT includes `typ: 'client'` — both middlewares reject cross-typed tokens
- [ ] No `client_id` in any client API path or body
- [ ] Return 404 (not 403) for cross-tenant resource access
- [ ] `project_deployments.api_keys_json` / `database_info` in denylist — never in any client DTO
- [ ] S3 presign for client downloads validates `visibility = 'client'` + ownership before signing
- [ ] Socket.IO client connections require valid client JWT
- [ ] Rate limit `/api/client/auth/login` (5 attempts / 15 min per email)
- [ ] `client_users.password_hash` — bcrypt, same cost factor as staff
- [ ] Invite tokens: single-use, 72h expiry, crypto.randomBytes(32)
- [ ] Audit: every client write action emits `activity_events` with `actor_type='client'`

---

## 13. What we are NOT doing (explicit deferrals)

| Item | Why deferred |
|---|---|
| Merge with `bos_*` schema | Separate products; converge later if needed |
| Custom client roles (DB-driven) | Hardcoded matrix is sufficient for v1 |
| Full email template system | Minimal `EmailService` for invites + notifications |
| Mobile apps | Mobile-first responsive web is sufficient |
| Instagram / email inbox channels | Schema supports it (`channel` column); implement after portal chat works |
| GraphQL | REST is sufficient for portal |
| Per-client Razorpay accounts | Single Curvvtech Razorpay account for v1 |

---

## 14. Success criteria (portal v1)

| Metric | Target |
|---|---|
| Client invite → first login | < 2 minutes |
| Admin publishes file → client sees it | < 5 seconds (realtime) |
| Invoice Pay Now → marked paid | < 30 seconds (including Razorpay checkout) |
| AI "What's our progress?" | Correct answer with project context |
| Zero admin API calls from portal | 100% — all traffic on `/api/client/*` |

---

*This specification is the frozen contract. Implementation begins with Phase 0 (migrations 034–035 + client auth). No portal UI until Phase 0 is deployed and verified.*
