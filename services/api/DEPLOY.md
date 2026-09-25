# Deploy Curvvtech on Vercel

Production is three Vercel projects from this repo. There is no EC2/AWS server deploy.

| App | Project | Domain | Root |
|---|---|---|---|
| API | `curvvtech-api` | `api.curvvtech.in` | `services/api` |
| Website | `curvvtech-website` | `www.curvvtech.in` | `apps/website` |
| Admin | `curvvtech-admin-panel` | `admin.curvvtech.com` | `apps/admin` |

Do **not** attach `api.curvvtech.in` to the website project.

## API

See [VERCEL.md](./VERCEL.md). Health: `GET /health` → `{ "ok": true }`. Ready: `GET /ready` (Postgres).

```bash
cd services/api
npm run vercel:link
npm run deploy:vercel
```

File uploads still use an S3 bucket (`S3_BUCKET` + keys). That is object storage, not the old API server.

## Website

```bash
cd apps/website
npm run vercel:link
npm run deploy
```

Set `NEXT_PUBLIC_BACKEND_URL=https://api.curvvtech.in` (or `NEXT_PUBLIC_API_URL`).

## Admin

```bash
cd apps/admin
npm run vercel:link
npm run deploy:vercel
```

Set `VITE_BACKEND_URL=https://api.curvvtech.in`. Never `SKIP_AUTH=true` on the API.

## DNS (GoDaddy)

- `api` **A** → `76.76.21.21`
- Website / admin domains stay on their existing Vercel records
