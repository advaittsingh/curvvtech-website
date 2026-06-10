# Admin panel “Cannot reach the API” – fix checklist

Do these in order. After each step, **redeploy** that project.

---

## 1. Backend is deployed and has env vars

- **Deployed:** You have a Vercel project whose **Root Directory** is `backend`. Its URL is something like `https://backend-curvvtech.vercel.app` (check in Vercel → that project → Deployments → visit the URL).
- **Test:** Open `https://YOUR-BACKEND-URL.vercel.app/health` in a browser. You should see `{"ok":true}`.
- **Env vars** for that backend project (Settings → Environment Variables):
  - `DATABASE_URL` = your Neon connection string
  - `CLERK_SECRET_KEY` = from Clerk Dashboard
  - `FRONTEND_URL` = `https://curvvtech.com` (or your main site URL)
  - `ADMIN_PANEL_URL` = `https://admin.curvvtech.com`

Redeploy the **backend** after adding or changing these.

---

## 2. Admin panel has the backend URL

- In the **admin panel** Vercel project (Root Directory = `admin panel `), go to **Settings → Environment Variables**.
- Add or fix:
  - **`VITE_BACKEND_URL`** = your backend URL **with no trailing slash**, e.g. `https://backend-curvvtech.vercel.app`

Redeploy the **admin panel** after changing this (Vite bakes env vars into the build).

---

## 3. Confirm

- Open **https://admin.curvvtech.com**, sign in, and open a data page (e.g. Blogs or Leads). The “Cannot reach the API” message should be gone and data should load (or “No blogs yet” etc.).

---

## Quick reference

See **ENV_VERCEL.md** in the repo root for the full table. Summary:

| Where        | Variable               | Example value                              |
|-------------|------------------------|--------------------------------------------|
| Admin panel | `VITE_BACKEND_URL`     | `https://your-backend.vercel.app` (no trailing slash) |
| Backend     | `ADMIN_PANEL_URL`      | `https://admin.curvvtech.com`              |
| Backend     | `DATABASE_URL`         | `postgresql://...` (Neon)                  |
| Backend     | `CLERK_SECRET_KEY`     | `sk_test_...` or `sk_live_...`             |

Redeploy each project after changing env vars.
