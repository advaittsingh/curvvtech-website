# Deploy Admin Panel to a New Vercel Project

Use either **Option A** (Dashboard) or **Option B** (CLI).

---

## Option A: Vercel Dashboard (recommended)

1. **Open** [vercel.com/new](https://vercel.com/new).

2. **Import** the same Git repository that contains your frontend (e.g. your curvvtech website repo).

3. **Configure the project:**
   - **Project Name:** e.g. `curvvtech-admin`
   - **Root Directory:** Click **Edit** and set to **`admin panel `** (the folder with this admin app; include the space, or rename the folder to `admin-panel` and use that).
   - **Framework Preset:** Other (or leave as detected).
   - **Build Command:** `npm run vercel-build` (should be picked up from `vercel.json`).
   - **Output Directory:** `dist/public` (from `vercel.json`).

4. **Environment variables** (required — add before first deploy or the app will show a blank or config message):
   - **`VITE_CLERK_PUBLISHABLE_KEY`** = your Clerk publishable key (same as main site). Without this, the app will show a setup message instead of the dashboard.
   - **`VITE_BACKEND_URL`** = your backend API URL (e.g. `https://your-backend.vercel.app` or `https://api.curvvtech.com`)

5. Click **Deploy**. After the build finishes, add your domain:
   - **Project → Settings → Domains** → Add **admin.curvvtech.com**.

6. **If admin.curvvtech.com is on your frontend project:** Remove it from the frontend project’s domains so only this new project serves the admin.

---

## Option B: Vercel CLI

1. **Install and log in** (if needed):
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **From the admin panel folder:**
   ```bash
   cd "admin panel "   # or  cd admin-panel  if you renamed it
   vercel
   ```

3. When prompted:
   - **Set up and deploy?** Yes
   - **Which scope?** Your account/team
   - **Link to existing project?** **N** (to create a new project)
   - **Project name:** e.g. `curvvtech-admin`
   - **Directory:** `./` (you’re already in the admin folder)

4. **Add env vars** for production:
   ```bash
   vercel env add VITE_BACKEND_URL production
   vercel env add VITE_CLERK_PUBLISHABLE_KEY production
   ```
   Enter the values when prompted.

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```
   Or use: `npm run deploy:vercel`.

6. **Add domain** in the dashboard: Project → Settings → Domains → **admin.curvvtech.com**.

---

## After deploy

- Open **https://admin.curvvtech.com** (or the `.vercel.app` URL).
- Sign in with Clerk; only users with `admin` or `manager` role in your DB can use the admin API.
