# Curvvtech monorepo (post-refactor)

## 1. Final folder structure

```
/
├── apps/
│   ├── website/          # @curvvtech/website — Next.js (app/, components/, lib/, styles/)
│   ├── admin/            # @curvvtech/admin — Vite + React (src/, index.html, public/)
│   ├── followup-web/     # @curvvtech/followup-web — Next.js landing (workspace)
│   └── mobile/           # Expo app (not in npm workspaces; cd apps/mobile && npm install)
├── services/
│   └── api/              # @curvvtech/api — Express + Postgres + Socket.IO (app.ts + server.ts)
├── packages/
│   ├── ui, api-client, auth, types   # shared stubs (grow over time)
│   └── db/               # README only — migrations in services/api/migrations
├── infra/                # docker-compose, aws stubs
├── scripts/              # setup.sh, clean.sh, deploy.sh
├── package.json          # workspaces: website, admin, followup-web, services/api, packages/*
├── REPO_MAP.md
├── .npmrc                # legacy-peer-deps=true (mixed Next/Vite toolchains)
└── .gitignore
```

## 2. Removed / deleted (high level)

| Removed | Notes |
|---------|--------|
| `backend/` (old Curvvtech Express) | Merged into `services/api` |
| `Follow Up/backend/` | Merged into `services/api` |
| `frontend /package/` | Replaced by `apps/website/` |
| `admin panel /` | Replaced by `apps/admin/` |
| Clerk on website | `ClerkProvider`, webhook `api/webhooks/clerk`, header modals |
| Clerk on admin | `ClerkProvider`, Clerk sign-in URLs |
| `next-auth` route + `lib/auth.ts` (website) | Unified JWT only |
| `apps/admin/server/`, `drizzle.config.ts`, `shared/` | Admin is static SPA only |
| `apps/website/src/app/api/auth/[...nextauth]/` | Removed |

## 3. Merged API modules (`services/api/src`)

| Area | Path / notes |
|------|----------------|
| Follow Up auth | `modules/auth/*` — signup, login, refresh, logout, me |
| Follow Up v1 API | `routes/v1/*`, `modules/inbox`, `modules/leads`, `modules/whatsapp`, … |
| Curvvtech admin CRM | `modules/curvvtech/admin/*` — blogs, leads, clients, projects, invoices, team, analytics, chats |
| Public chat + AI | `modules/curvvtech/chat.routes.ts`, `chatDb.ts`, `services/aiService`, `summaryService`, `whatsappService` |
| Realtime | `socket.io` in `server.ts` + `chatSocket.ts` |
| DB | Single `pg` `Pool` in `db.ts`; re-export `src/config/db.ts` |
| Tagged SQL helper | `lib/sqlPool.ts` (replaces Neon serverless driver for admin queries) |

**Route map**

| Prefix | Purpose |
|--------|---------|
| `/health`, `/ready` | ALB / ops |
| `/auth/*` and `/api/auth/*` | Same router (mobile + new clients) |
| `/v1/*` and `/api/v1/*` | Follow Up REST API |
| `/api/admin/*` | Curvvtech dashboard (JWT + `users.curvvtech_role` ∈ admin, manager) |
| `/api/chat/*` | Public widget chat |
| `/webhook/whatsapp` and `/api/webhook/whatsapp` | Meta WhatsApp |

## 4. Breaking changes

1. **One Postgres** — Follow Up `users` table must include `curvvtech_role` (run `services/api/migrations/006_curvvtech_platform.sql`). Grant admins: `UPDATE users SET curvvtech_role = 'admin' WHERE email = '…';`
2. **Clerk removed** — No Clerk webhook; no `clerk_user_id` flow on website/admin.
3. **Admin auth** — Email/password → `POST /api/auth/login`; store `access_token` / `refresh_token` in `localStorage` (admin client).
4. **Website env** — Use `NEXT_PUBLIC_API_URL` (fallback `NEXT_PUBLIC_BACKEND_URL`) as **API origin only** (no `/api` suffix). Chat calls `${API}/api/chat/...`.
5. **Mobile** — Set base URL to API host; paths stay `/v1/...` or `/api/v1/...` depending on whether you include `/api` in the base. Recommended: `EXPO_PUBLIC_API_URL=https://api.example.com` and client requests `/api/v1/...`.
6. **Team admin API** — `PATCH /api/admin/team/members/:userId` body `{ "curvvtech_role": "admin" \| "manager" \| "member" \| null }` (no Clerk IDs).
7. **Curvvtech CRM tables** — If you never ran the old `backend/scripts/admin-schema.sql`, run equivalent SQL against the same DB (recover from git history if needed).
8. **Default API port** — Follow Up default `3000` (was Curvvtech `4000`). Set `PORT` in Docker/ECS.

## 5. Environment variables

### `services/api` (Docker / ECS / local)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `JWT_SECRET` | Prod | Access token HS256 secret |
| `JWT_REFRESH_SECRET` | Prod | Reserved for refresh rotation |
| `PORT` | No | Default `3000` |
| `NODE_ENV` | No | `production` / `development` |
| `SKIP_AUTH` | Dev only | `true` bypasses JWT (never in prod) |
| `FRONTEND_URL` | CORS | Website origin |
| `ADMIN_PANEL_URL` | CORS | Admin origin |
| `CORS_ORIGINS` | No | Comma-separated extra origins |
| `OPENAI_API_KEY` | For AI chat / Follow Up AI | |
| `LANDING_API_KEY` | Follow Up public routes | |
| `REDIS_URL` | Optional | Distributed rate limits |
| `S3_*`, `AWS_*` | Optional | Uploads |
| WhatsApp / Twilio vars | Optional | As before in Follow Up docs |

### `apps/website`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api.curvvtech.com` (origin only) |

### `apps/admin`

| Variable | Description |
|----------|-------------|
| `VITE_BACKEND_URL` | Same origin as API, e.g. `https://api.curvvtech.com` |

### `Follow Up/mobile`

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | e.g. `https://api.curvvtech.com` — use `/api/v1` paths in client or append `/api` to base consistently |

## 6. Scripts

```bash
npm install          # root — installs all workspaces
npm run dev          # api + website + admin (concurrently)
npm run build        # all three workspaces
npm run dev:api      # API only
docker build -t curvvtech-api ./services/api
```

## 7. Bonus implemented

- Request logging: existing `withRequestLogger` (pino) on API.
- Global error handler: `middleware/errorHandler.ts`.
- 404 JSON handler on unknown routes.
- `organization_id` / multi-tenant: already present in Follow Up schema (`tenants`, `tenant_users`); not expanded in this refactor.
