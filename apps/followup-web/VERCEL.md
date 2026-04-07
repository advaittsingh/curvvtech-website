# Deploy the marketing site to Vercel (landing only)

This Next.js app talks to **Neon** and **Amazon Cognito** directly. You do **not** deploy the FollowUp API here.

## 1. Prerequisites

- Postgres schema applied on your Neon database: from the repo, run  
  `cd backend && DATABASE_URL="<your-neon-url>" npm run migrate`  
  (same database the site will use).
- A Cognito User Pool + app client with **USER_PASSWORD_AUTH** enabled (same as the mobile app).

## 2. Create the Vercel project

**Option A — Dashboard**

1. [Vercel](https://vercel.com) → **Add New…** → **Project** → import your Git repo.
2. **Root Directory**: set to `Follow-up Website Landing` (the folder that contains `package.json` and `next.config.mjs`).  
   If you skip this, the build will fail because the monorepo root is not a Next app.
3. **Framework Preset**: Next.js (auto-detected).
4. **Build & Output**: defaults (`npm run build`, output `.next`).
5. **Environment variables (Production)**

   **Option 1 — CLI (batch)**  
   From this folder:

   ```bash
   cp .env.vercel.example .env.vercel
   # Edit .env.vercel with real values (file is gitignored).
   ./scripts/sync-vercel-env.sh
   ```

   **Option 2 — CLI (one at a time)**

   ```bash
   npx vercel env add DATABASE_URL production --value "YOUR_NEON_POOLED_URL" --yes --sensitive --force
   npx vercel env add COGNITO_REGION production --value "us-east-1" --yes --force
   npx vercel env add COGNITO_USER_POOL_ID production --value "us-east-1_xxxxx" --yes --force
   npx vercel env add COGNITO_CLIENT_ID production --value "yourClientId" --yes --force
   npx vercel env add ACCESS_CAP production --value "1000" --yes --force   # optional
   ```

   **Option 3 — Dashboard**  
   Project → Settings → Environment Variables.

   | Name | Notes |
   |------|--------|
   | `DATABASE_URL` | Neon pooled URL (`lib/neon.ts` also accepts `POSTGRES_PRISMA_URL` / `NEON_DATABASE_URL`). |
   | `COGNITO_REGION` | e.g. `us-east-1` |
   | `COGNITO_USER_POOL_ID` | e.g. `us-east-1_xxxx` |
   | `COGNITO_CLIENT_ID` | Public app client (USER_PASSWORD_AUTH). |
   | `ACCESS_CAP` | Optional; default `1000`. |

6. **Deploy**.

**Option B — CLI** (from your machine)

```bash
cd "Follow-up Website Landing"
npx vercel login
npx vercel link    # create/link project; when asked, set root to this folder if importing whole repo
npx vercel env pull   # optional: after setting vars in dashboard
npx vercel --prod
```

If the repo root is not this app, link the project with **Root Directory** = `Follow-up Website Landing` in the project settings, or run CLI only from this directory after `cd`.

## 3. After deploy

- Open the production URL and test **Sign up**, **Log in**, and **Onboarding** (questionnaire).
- Cookies are **httpOnly** and `Secure` in production; login only works over **HTTPS** (Vercel provides this).

## 4. Neon + Vercel

You can use the [Neon Vercel integration](https://vercel.com/integrations/neon) so `DATABASE_URL` is injected automatically; still run **backend migrations** once against that database.

## 5. Troubleshooting

| Symptom | Check |
|---------|--------|
| `503` / database errors | `DATABASE_URL` set for **Production**, migrations ran, `waitlist_entries` / `users` / `business_profiles` exist. |
| `503` on sign up / login | `COGNITO_*` vars set; pool allows **USER_PASSWORD_AUTH**; same **region** as the pool. |
| Build fails “No Next.js” | **Root Directory** must be `Follow-up Website Landing`. |
