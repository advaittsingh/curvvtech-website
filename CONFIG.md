# CurvvTech – Frontend, Backend & Admin Panel Configuration

This repo has **three deployable apps**. Each needs its own Vercel project (or local env) and the correct environment variables so they work together.

---

## 1. Frontend (public website)

- **Path:** `frontend /package/`
- **Framework:** Next.js
- **Domain (production):** e.g. `https://curvvtech.com` or `https://curvvtech-portal.vercel.app`
- **Role:** Public site, Clerk auth, Clerk webhook syncs users to Neon.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (same app as admin). |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key (for server-side Clerk). |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Yes | From Clerk Dashboard → Webhooks → your endpoint (syncs users to Neon). |
| `DATABASE_URL` | Yes | Neon Postgres connection string (pooled). Same DB as backend. |
| `NEXT_PUBLIC_BACKEND_URL` | If using backend auth | Backend API URL (e.g. `https://your-backend.vercel.app`). No trailing slash. |

**Vercel:** Set these in the **frontend** project. Redeploy after changes.

---

## 2. Backend (API)

- **Path:** `backend/`
- **Framework:** Express (Node)
- **Domain (production):** e.g. `https://curvvtech-backend.vercel.app`
- **Role:** `/auth` (Supabase auth), `/api/admin/*` (Clerk JWT + Neon), CORS for frontend and admin.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string (same DB as frontend webhook). |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key (verifies JWT for `/api/admin/*`). |
| `FRONTEND_URL` | Yes | Frontend origin for CORS (e.g. `https://curvvtech.com`). No trailing slash. |
| `ADMIN_PANEL_URL` | Yes | Admin panel origin for CORS (e.g. `https://admin.curvvtech.com`). No trailing slash. |
| `SUPABASE_URL` | If using /auth | Supabase project URL (for `/auth/signin`, `/auth/signup`). |
| `SUPABASE_ANON_KEY` | If using /auth | Supabase anon key. |
| `BACKEND_URL` | Optional | This backend’s public URL (for emails/OAuth links). |

**Vercel:** Create a **separate** project with **Root Directory** = `backend`. Set the variables above. Redeploy.

**Important:** If `ADMIN_PANEL_URL` is wrong or missing, the admin panel will get CORS errors and show "Failed to load data."

---

## 3. Admin panel (internal dashboard)

- **Path:** `admin panel /`
- **Framework:** Vite + React (SPA)
- **Domain (production):** `https://admin.curvvtech.com`
- **Role:** CurvvTech Admin UI; calls backend with Clerk Bearer token.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Same Clerk publishable key as frontend. |
| `VITE_BACKEND_URL` | Yes | Backend API URL (e.g. `https://curvvtech-backend.vercel.app`). No trailing slash. |

**Vercel:** Create a **separate** project with **Root Directory** = `admin panel ` (or `admin-panel`). Set the variables above. Add domain `admin.curvvtech.com`. Redeploy after changing env vars.

**Important:** If `VITE_BACKEND_URL` is wrong or missing, all admin pages will show "Failed to load data."

---

## How they work together

1. **Clerk** – One Clerk application. Frontend and admin use the same publishable key; backend uses the secret key to verify JWTs.
2. **Neon** – One database. Frontend webhook writes users (from Clerk) into `users`; backend reads `users` and admin tables (blogs, leads, etc.).
3. **Admin access** – Only users in Neon `users` with `role` = `admin` or `manager` can call `/api/admin/*`. Set role in DB or via your app after Clerk webhook creates the user.
4. **CORS** – Backend allows origins from `FRONTEND_URL` and `ADMIN_PANEL_URL`. Use exact production URLs (no trailing slash).

---

## Quick checklist (production)

- [ ] **Frontend:** `DATABASE_URL`, Clerk keys, `CLERK_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_BACKEND_URL` (if used).
- [ ] **Backend:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `FRONTEND_URL`, `ADMIN_PANEL_URL`; Supabase vars if using `/auth`.
- [ ] **Admin panel:** `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BACKEND_URL`.
- [ ] **Clerk Dashboard:** Add `https://admin.curvvtech.com` (and your frontend URL) where required; use “development host” or allowed redirect URLs as needed for sign-in.
- [ ] **Neon:** Run `backend/scripts/admin-schema.sql` once so admin tables exist.
- [ ] Redeploy all three after changing any env vars.
