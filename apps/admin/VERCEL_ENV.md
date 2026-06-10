# Admin Panel – Environment Variables for Vercel

See the repo root **[CONFIG.md](../CONFIG.md)** for how frontend, backend, and admin panel fit together.

Add these in your **admin-panel** Vercel project: **Settings → Environment Variables**.

Use these for **Production** (and **Preview** if you want):

| Name | Value | Notes |
|------|--------|------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` (same as frontend) | Required for Clerk session. |
| `VITE_CLERK_ACCOUNTS_URL` | `https://blessed-sawfish-57.accounts.dev` | **Required for sign-in.** Your Clerk Account Portal base URL (from Clerk Dashboard → Configure → Paths; no trailing slash). Without this, the sign-in button cannot work. |
| `VITE_BACKEND_URL` | Your backend API URL | **Required for data.** e.g. `https://curvvtech-backend-xxx.vercel.app` (no trailing slash). If missing or wrong, all pages show "Failed to load data." |

**Important:**
- After adding or changing env vars, **redeploy** the admin panel so the new values are baked into the build.
- The **backend** must have **`ADMIN_PANEL_URL=https://admin.curvvtech.com`** (in the backend Vercel project) so CORS allows requests from the admin panel. Otherwise you’ll get "Failed to load data" or CORS errors.

**Do not add to the admin panel:** `CLERK_SECRET_KEY`, `DATABASE_*`, `NEXTAUTH_*` — those belong in the **backend** or **frontend** project only.
