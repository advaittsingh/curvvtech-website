# Auth (backend + frontend)

Auth is handled by a **standalone backend** in the `backend` directory. Deploy the backend as a separate project and point the frontend to it.

## Backend

- See **`backend/README.md`** for setup and endpoints.
- Set `FRONTEND_URL` and `BACKEND_URL` (and Supabase keys) in the backend `.env`.
- In Supabase email templates, set the “Confirm signup” redirect to:  
  `{{ .SiteURL }}` replaced by your **backend** URL, e.g. `https://api.curvvtech.com/auth/confirm` (backend will verify and redirect to frontend with tokens).

## Frontend

- Set **`NEXT_PUBLIC_BACKEND_URL`** in `.env.local` (e.g. `http://localhost:4000` or `https://api.curvvtech.com`).
- Auth flows (sign in, sign up, OAuth, forgot password) call the backend API; tokens are stored in `localStorage` and sent as `Authorization: Bearer <token>` to `GET /auth/session`.

## OAuth

Configure Google/GitHub in the Supabase Dashboard. The redirect URL for the provider must be the **backend** OAuth callback, e.g. `https://api.curvvtech.com/auth/callback` (or your backend base URL + `/auth/callback`).
