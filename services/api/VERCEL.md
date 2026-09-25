# Deploy Curvvtech API on Vercel

Do **not** add `api.curvvtech.in` to the **website** project (`curvvtech-website`). One Vercel project serves one app: attaching that hostname there would show the marketing site, not the API.

Use a **separate** project whose root is `services/api`, then attach the domain there.

## Project

| Setting | Value |
|---|---|
| Vercel project | `curvvtech-api` |
| Root Directory | `services/api` |
| Domain | `api.curvvtech.in` |
| Website project | `curvvtech-website` (`www.curvvtech.in`) — leave as-is |
| Admin project | `curvvtech-admin-panel` (`admin.curvvtech.com`) — `VITE_BACKEND_URL=https://api.curvvtech.in` |

## CLI

From this folder:

```bash
npm run vercel:link
# Set env vars in Vercel (DATABASE_URL, JWT_SECRET, …) — never SKIP_AUTH=true
npm run deploy:vercel
npx vercel domains add api.curvvtech.in --scope curvvtech
```

DNS at GoDaddy (nameservers are still `ns17.domaincontrol.com` / `ns18.domaincontrol.com`):

- Set **A** record: host `api` → `76.76.21.21`
- Remove the old A record that pointed `api` at the EC2 box

Until DNS caches expire, the API also answers at `https://curvvtech-api.vercel.app`.

## What Vercel does not run

The long-lived Node process (`src/server.ts`) is not used on Vercel. That means:

- Socket.IO (live chat / inbox badges) — REST still works
- Twilio media streams / AI call worker
- Anything that needs a persistent WebSocket server

Admin, auth, CMS, invoices, and public content HTTP routes work.
