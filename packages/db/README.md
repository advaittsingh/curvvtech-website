# Database migrations

Canonical SQL migrations live in **`services/api/migrations/`**.

Run against your single Postgres (Neon or RDS) with:

```bash
cd services/api && npm run migrate
```

Apply **`006_curvvtech_platform.sql`** after follow-up user tables exist; it adds `users.curvvtech_role` for the Curvvtech admin panel (JWT).

Also run **`backend/scripts/admin-schema.sql`** once if Curvvtech CRM tables (blogs, leads, conversations, …) are missing — or keep using your existing Neon schema from the old `backend` folder (copied before removal).
