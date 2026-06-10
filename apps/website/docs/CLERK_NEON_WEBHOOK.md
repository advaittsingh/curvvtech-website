# Clerk → Neon user sync (webhook)

Users are synced from Clerk to Neon Postgres via a webhook so you have a `users` table for roles, app data, and queries.

## 1. Create the table in Neon

**Option A (recommended):** From the frontend package with `DATABASE_URL` in `.env.local` (Node 20+):

```bash
npm run db:init
```

**Option B:** In [Neon](https://neon.tech) → your project → **SQL Editor**, run the contents of `scripts/neon-users-schema.sql`.

## 2. Environment variables

In `.env.local` (and in Vercel for the frontend project) set:

- **`DATABASE_URL`** – Neon connection string (e.g. `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
- **`CLERK_WEBHOOK_SIGNING_SECRET`** – From Clerk Dashboard → **Webhooks** → your endpoint → **Signing secret** (starts with `whsec_`).

## 3. Create the webhook in Clerk

1. [Clerk Dashboard](https://dashboard.clerk.com) → **Webhooks** → **Add endpoint**.
2. **Endpoint URL**:  
   - Production: `https://your-domain.com/api/webhooks/clerk`  
   - Local: use an ngrok (or similar) URL, e.g. `https://xxx.ngrok.io/api/webhooks/clerk`.
3. **Subscribe to events**: `user.created`, `user.updated`, `user.deleted`.
4. Create the endpoint, then copy the **Signing secret** into `CLERK_WEBHOOK_SIGNING_SECRET`.

## 4. Behaviour

- **user.created** → insert into `users` (or upsert on `clerk_user_id`).
- **user.updated** → update `email`, `name`, `image_url`, `updated_at`.
- **user.deleted** → delete row with matching `clerk_user_id`.

The webhook handler lives in `src/app/api/webhooks/clerk/route.ts` and uses `src/lib/db.ts` for Neon.

## 5. Linking Clerk and your app

Use **`clerk_user_id`** as the stable link:

- In your app, get the Clerk user id from the JWT (e.g. `auth().userId`).
- In the DB, query or join on `users.clerk_user_id`.

Passwords stay in Clerk only; do not store them in your database.
