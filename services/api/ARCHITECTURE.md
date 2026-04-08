# Backend architecture

## Layout

- **`src/index.ts`** — Express app, middleware order (logger → CORS → JSON + `rawBody` → routes → centralized `errorHandler`).
- **`src/config.ts`** — Environment-backed configuration (no secrets in code).
- **`src/middleware/`** — `auth`, `tenantContext` (`X-Tenant-Id` + membership), `errorHandler`, `rateLimitDistributed` (Redis or memory).
- **`src/lib/`** — `errors` (`AppError`), `asyncHandler`, `validate` (Zod), `asyncHandler`.
- **`src/modules/`** — Feature modules (controller → service → repository):
  - **`whatsapp/`** — Webhook GET/POST, parser, ingest service, outbound `send.service`.
  - **`inbox/`** — Tenant-scoped conversations and messages APIs.
  - **`leads/`** — `wa-crm` REST for `wa_leads` + `lead_activities`.
  - **`tenants/`** — `GET /v1/tenants` (memberships).
  - **`automation/`** — Rule evaluation from DB (keyword → auto-reply, etc.).
- **`src/routes/v1/`** — Legacy and shared v1 routes; authenticated stack vs **`resolveTenantContext`** stack for `/inbox` and `/wa`.

## Multi-tenancy

- Data is scoped by **`tenant_id`** on conversations, messages, leads, and WhatsApp accounts.
- Authenticated clients send **`X-Tenant-Id`** when the user belongs to more than one tenant; a single membership auto-resolves.

## Database

- SQL migrations live in **`migrations/`** (e.g. `004_saas_multitenant.sql`). Run `npm run migrate` against `DATABASE_URL`.

## Operations

- **Auth**: `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`. Set `JWT_SECRET` + `JWT_REFRESH_SECRET` when `SKIP_AUTH=false`. Access tokens are HS256 JWTs; refresh tokens are opaque strings stored hashed on `users`.
- **Redis** (`REDIS_URL`): distributed rate limits; omit for single-node dev (in-memory fallback).
- **Webhooks**: In production, configure `WHATSAPP_APP_SECRET` and keep `REQUIRE_WHATSAPP_SIGNATURE=true` so Meta signatures are enforced.
