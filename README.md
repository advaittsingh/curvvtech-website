# Curvvtech monorepo

Unified codebase for the Curvvtech website, admin dashboard, and **one** backend API (`services/api`).

## Structure

See **[REPO_MAP.md](./REPO_MAP.md)** for the full directory layout and workspace names.

## Prerequisites

- Node.js 20+ (22 recommended for the API Docker image)
- npm (workspaces)

## Setup

```bash
npm install
npm run build   # optional; verifies all workspaces compile
```

Copy env examples:

- `apps/website/.env.example` → `apps/website/.env.local`
- `apps/admin/.env.example` → `apps/admin/.env.local`
- `services/api` — set `DATABASE_URL` and JWT secrets for production (see `MONOREPO.md`)

## Development

```bash
npm run dev              # API + website + admin (concurrently)
npm run dev:website
npm run dev:admin
npm run dev:api
```

## Further reading

- [MONOREPO.md](./MONOREPO.md) — environment variables, API route map, migrations
- [REPO_MAP.md](./REPO_MAP.md) — folder map and commands
