# Follow-up API

TypeScript **Express** + **PostgreSQL** + **OpenAI**, with **JWT + email/password** auth (`/auth/*`), per-user leads, profile/business sync, Ask AI, feedback, and landing-site proxy routes.

## Setup

1. **Environment:** copy `.env.example` to `.env`.

2. **Postgres**

   **Docker:** start **Docker Desktop** (or the daemon), then:

   ```bash
   docker compose up -d
   npm install
   npm run migrate
   ```

   `npm run migrate` loads variables from `.env` (via `dotenv`).

   **Your own server:** set `DATABASE_URL` in `.env`, then `npm run migrate`.

3. **Run API**

   ```bash
   npm install
   npm run dev
   ```

   Listens on **`0.0.0.0:PORT`** (default **3000**).

4. **Local dev without JWT:** set `SKIP_AUTH=true` in `.env`. The API uses `DEV_AUTH_SUB` / `DEV_AUTH_EMAIL` and provisions a single dev user.

5. **Production:** set `SKIP_AUTH=false`, set `JWT_SECRET` and `JWT_REFRESH_SECRET`, run `npm run migrate`, and see [DEPLOY.md](./DEPLOY.md).

6. **Mobile:** set `EXPO_PUBLIC_API_URL` to the **API origin only** (e.g. `http://<lan-ip>:3000`), not `.../v1`. Auth: `POST /auth/login`. Other calls use `/v1/...` paths on the client.

## API

**Auth (JSON, no bearer required except logout/me):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | `{ "email", "password" }` → user + tokens |
| POST | `/auth/login` | `{ "email", "password" }` → tokens |
| POST | `/auth/refresh` | `{ "refresh_token" }` → new tokens |
| POST | `/auth/logout` | Bearer access token → revoke refresh |
| GET | `/auth/me` | Bearer access token → same shape as `/v1/me` |

## API (`/v1`, all JSON)

Authenticated routes require `Authorization: Bearer <access JWT>` unless `SKIP_AUTH=true`.

| Method | Path | Description |
|--------|------|----------------|
| GET | `/health` | Liveness |
| GET | `/ready` | Readiness (DB ping) |
| GET | `/v1/me` | Session: `access_allowed`, `waitlist_position`, `email` |
| GET/PATCH | `/v1/me/profile` | User profile (snake_case fields) |
| POST | `/v1/me/profile/upload-url` | Presigned S3 PUT (`purpose`, `content_type`) |
| GET/PATCH | `/v1/me/business` | Business + `questionnaire` JSON |
| GET | `/v1/leads` | Current user’s leads |
| POST | `/v1/parse-lead` | Body `{ "text" }` → OpenAI extraction + insert |
| PATCH | `/v1/leads/:id` | `{ "status"?, "follow_up_at"? }` |
| GET | `/v1/ai/chat/messages` | Chat history |
| POST | `/v1/ai/chat` | Body `{ "message" }` → assistant reply |
| POST | `/v1/feedback` | Body `{ "message", "subject"?, "app_version"?, "platform"? }` |
| POST | `/v1/devices` | `{ "fcm_token" \| "apns_token", "platform"? }` |

**Public (landing site):** header `x-followup-api-key: <LANDING_API_KEY>`

| Method | Path |
|--------|------|
| POST | `/v1/public/waitlist` |
| GET | `/v1/public/waitlist/count` |
| POST | `/v1/public/onboarding` |

## WhatsApp Business (Cloud API)

Public webhooks (no JWT):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/webhook/whatsapp` | Meta verification (`hub.verify_token` must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN`; returns `hub.challenge`) |
| POST | `/webhook/whatsapp` | Inbound events. Verifies `X-Hub-Signature-256` when `WHATSAPP_APP_SECRET` is set (Meta **App secret**, not the API user token). |

**Env:** `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `OPENAI_API_KEY`. **Tenant mapping:** set `users.whatsapp_phone_number_id` to Meta’s **Phone number ID** (WhatsApp → API Setup), or call **`PATCH /v1/me/whatsapp`** with `{ "whatsapp_phone_number_id": "<id>" }`. For a single-tenant beta without DB edits, optional **`WHATSAPP_FALLBACK_PHONE_NUMBER_ID`** + **`WHATSAPP_FALLBACK_AUTH_SUB`** (must match `DEV_AUTH_SUB` when using `SKIP_AUTH=true`). Run `npm run migrate` for `wa_conversations`, `wa_messages`, `wa_leads`.

## Legacy SQL

`sql/001_leads.sql` is superseded by `migrations/001_leads.sql` — use **`npm run migrate`** only.

## Docker image

```bash
docker build -t followup-api .
```
