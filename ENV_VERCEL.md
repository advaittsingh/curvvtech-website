# Vercel environment variables

Set these in **Vercel → your project → Settings → Environment Variables**.  
Use **Production** (and optionally Preview) for each. **Redeploy** after changing.

---

## Admin panel project (admin.curvvtech.com)

| Variable | Value | Required |
|----------|--------|----------|
| `VITE_BACKEND_URL` | Your backend URL, e.g. `https://curvvtech-backend.vercel.app` | **Yes** – no trailing slash |
| `VITE_CLERK_PUBLISHABLE_KEY` | From Clerk Dashboard (pk_test_... or pk_live_...) | Yes |
| `VITE_CLERK_ACCOUNTS_URL` | Clerk Account Portal URL (optional, for sign-in link) | No |

**If `VITE_BACKEND_URL` is wrong or missing:** the admin panel shows "Cannot reach the API" and data fails to load.

---

## Backend project (API for admin + frontend)

| Variable | Value | Required |
|----------|--------|----------|
| `ADMIN_PANEL_URL` | `https://admin.curvvtech.com` | **Yes** – CORS allows admin panel |
| `DATABASE_URL` | Neon PostgreSQL connection string | **Yes** |
| `CLERK_SECRET_KEY` | From Clerk Dashboard (sk_test_... or sk_live_...) | **Yes** |
| `FRONTEND_URL` | `https://www.curvvtech.com` (or your main site) | Yes for CORS |

**If `ADMIN_PANEL_URL` is wrong or missing:** the admin panel gets CORS errors and "Cannot reach the API."

---

## After changing env vars

1. **Backend:** Redeploy the backend project so new env vars are used.
2. **Admin panel:** Redeploy the admin panel project (Vite bakes `VITE_*` into the build).

Then open https://admin.curvvtech.com and confirm data loads.
