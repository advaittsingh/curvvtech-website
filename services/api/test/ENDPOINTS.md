# Curvvtech API — route inventory

Base URL examples: `https://api.example.com` — many paths are also mounted under `/api/...` (see `src/app.ts`).

> **Response shape:** Legacy handlers return domain-specific JSON (`{ ok }`, `{ error, message }`, `{ user, access_token }`, etc.). A future major version may standardize on `{ success, data, error }`; clients must not assume one envelope for all routes.

## Core

| Method | Path(s) | Auth | Notes |
|--------|---------|------|--------|
| GET | `/health` | — | `{ ok: true }` |
| GET | `/ready` | — | DB ping; 503 if DB down |

## WhatsApp webhook

| Method | Path(s) | Notes |
|--------|---------|--------|
| GET | `/webhook/whatsapp`, `/api/webhook/whatsapp` | Meta verify |
| POST | same | Inbound events |

## Auth (also under `/api/auth/*`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/signup` | Body: `{ email, password }` |
| POST | `/auth/login` | Body: `{ email, password }` |
| POST | `/auth/refresh` | Body: `{ refresh_token }` |
| POST | `/auth/logout` | Bearer |
| GET | `/auth/me` | Bearer |

## Demo booking (also `/api/demo/*`; followup-web uses Next.js `/api/demo` on Vercel)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/demo/slots?date=YYYY-MM-DD` | Weekday only |
| POST | `/demo/book` | Body: `{ date, time, name, email, phone?, company? }` |

## Curvvtech admin (also `/admin/*` alias)

Mounted at `/api/admin` and `/admin`. All routes require Bearer JWT + `users.curvvtech_role` in `admin` \| `manager`.

Sub-routers: `blogs`, `leads`, `clients`, `projects`, `invoices`, `team`, `analytics`, `chats`, `demo-requests` — see `src/modules/curvvtech/admin/*.ts` for full list (CRUD + nested resources).

## Public chat (website widget)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/chat/conversations` | |
| GET | `/api/chat/conversations/:id` | |
| POST | `/api/chat/conversations/:id/messages` | |
| POST | `/api/chat/conversations/:id/close` | |
| GET | `/api/chat/whatsapp-url` | |

## v1 (also `/api/v1/*`)

### Public (`/v1/public/*`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/v1/public/waitlist/count` | Header `x-followup-api-key` |
| POST | `/v1/public/waitlist` | same |
| POST | `/v1/public/onboarding` | same |

### Authenticated (Bearer)

| Method | Path | Router |
|--------|------|--------|
| GET | `/v1/tenants` | tenants |
| GET/POST/PATCH | `/v1/leads`, `/v1/parse-lead`, `/v1/leads/:id/...` | leads |
| GET/PATCH | `/v1/me`, `/v1/me/whatsapp`, `/v1/me/profile`, `/v1/me/business`, POST upload-url | me |
| GET/DELETE/POST | `/v1/ai/chat/messages`, `/v1/ai/chat` | ai |
| POST | `/v1/feedback` | feedback |
| POST | `/v1/devices` | devices |

### Tenant-scoped (Bearer + tenant context)

| Method | Path | Notes |
|--------|------|--------|
| GET/POST | `/v1/inbox/conversations`, `.../:id`, `.../messages`, `.../read` | |
| GET/POST/PATCH | `/v1/wa/leads`, `.../generate-insights`, `.../follow-up-draft` | |
