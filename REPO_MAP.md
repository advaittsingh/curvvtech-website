# Repository map

Canonical layout for **curvvtech** (this monorepo):

```text
/
├── apps/
│   ├── website/           Next.js — Curvvtech marketing site, auth UI, chat widget
│   │   ├── app/           App Router (routes, layouts only — no API routes)
│   │   ├── components/    React components (shared UI for the site)
│   │   ├── lib/           Utilities, providers, data helpers
│   │   ├── styles/        Global CSS (e.g. globals.css)
│   │   ├── public/        Static assets
│   │   ├── proxy.ts       Next.js proxy (middleware-style routing)
│   │   └── next.config.mjs
│   ├── admin/             Vite + React admin dashboard
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   ├── public/
│   │   ├── index.html
│   │   └── vite.config.ts
│   ├── followup-web/      Next.js Follow Up landing (@curvvtech/followup-web)
│   └── mobile/            Expo app (separate install under apps/mobile)
├── services/
│   └── api/               Single Express + Postgres + Socket.IO API
│       ├── src/
│       │   ├── app.ts     createApp() — HTTP middleware + routes
│       │   ├── server.ts  process lifecycle, listen, Socket.IO, shutdown
│       │   ├── index.ts   Entry — imports server
│       │   ├── config/    env.ts, db.ts (re-exports), constants (as needed)
│       │   ├── modules/   Domain routers (auth, curvvtech, whatsapp, …)
│       │   ├── middleware/
│       │   ├── routes/    index.ts + v1/…
│       │   └── utils/     e.g. jwt.ts (shared token helpers)
│       └── Dockerfile
├── packages/              Shared libraries (optional consumption from apps)
│   ├── ui/
│   ├── api-client/
│   ├── auth/
│   ├── types/
│   └── db/                Notes only — SQL migrations live under services/api/migrations
├── infra/
│   ├── docker-compose.yml # DB + API local stack
│   └── aws/               ECS/RDS stubs
├── scripts/               setup.sh, clean.sh, deploy.sh
├── package.json           npm workspaces
└── MONOREPO.md            Env vars, breaking changes, route map
```

## npm workspaces

| Workspace | Package name | Role |
|-----------|----------------|------|
| `apps/website` | `@curvvtech/website` | Public site |
| `apps/admin` | `@curvvtech/admin` | Admin SPA |
| `apps/followup-web` | `@curvvtech/followup-web` | Follow Up landing |
| `services/api` | `@curvvtech/api` | Backend |
| `packages/*` | `@curvvtech/ui`, … | Shared stubs (grow over time) |

## Quick commands

| Goal | Command |
|------|---------|
| Install all | `npm install` (repo root) |
| Dev (api + website + admin) | `npm run dev` |
| Build everything | `npm run build` |
| API + Postgres (Docker) | `docker compose -f infra/docker-compose.yml up --build` |
| Follow Up landing only | `npm run dev:followup-web` |

## Docs

- **Operational detail:** [MONOREPO.md](./MONOREPO.md)
