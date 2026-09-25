# Curvvtech Client Portal

Mobile-first, white-label client portal built on Next.js 16 (App Router) + Tailwind v4.
It consumes the shared Curvvtech API under `/api/client/*` and never contains business logic —
it only renders data the admin panel has published.

## Features

- **Auth** — separate client JWT stack (login, invite acceptance, password reset, refresh rotation).
- **Dashboard** — active projects, progress, pending invoices, unread notifications, activity feed.
- **Projects** — overview, timeline, milestones, tasks (client can mark complete), scope, files, revisions.
- **Documents** — download shared, client-visible files (presigned URLs).
- **Billing** — invoices + Razorpay "Pay now" with server-side payment reconciliation.
- **Approvals** — approve/reject deliverables with an audit trail.
- **Support** — real-time inbox (Socket.IO) unified with the website chat engine.
- **Meetings** — upcoming/past meetings, notes, recordings.
- **Notifications** — in-app bell fed by the unified `activity_events` engine.
- **AI Assistant** — floating, project-aware assistant that answers from the client's own data.
- **White-label** — branding (logo, colors, company name) resolved per host/organization.

## Local development

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm install
npm run dev                  # http://localhost:3004
```

The API must be running (see `services/api`) with these env vars set:

```
CLIENT_JWT_SECRET=<random secret, separate from JWT_SECRET>
CLIENT_PORTAL_URL=http://localhost:3004
```

## Architecture

See `docs/client-portal/ARCHITECTURE.md` for the full backend contract:
migrations `034`–`040`, shared service layer, DTO serialization, visibility/publish
workflow, activity engine, and Socket.IO room model.
