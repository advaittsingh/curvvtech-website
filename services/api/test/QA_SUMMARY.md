# API QA summary (automated + manual notes)

## 1. Endpoints inventoried

See **`ENDPOINTS.md`** for the full route list grouped by mount (`/auth`, `/api/admin`, `/v1`, `/api/chat`, `/api/demo`, webhooks, etc.).

## 2. Test harness

- **File:** `test/api.test.ts`
- **Runner:** Vitest + Supertest (in-process HTTP against `createApp()`)
- **Run:** `cd services/api && npm run test`
- **Env:** `test/setup.ts` loads `.env.aws` then `.env` (needs `DATABASE_URL` + `JWT_SECRET` / `JWT_REFRESH_SECRET` for integration tests).

## 3. What the suite covers

| Area | Checks |
|------|--------|
| Smoke | `/health`, JSON 404, auth 400/401, admin 401 without token, `/admin` alias, demo slots validation + `/demo` alias |
| DB | `/ready` |
| Auth | Signup, login via `/api/auth/login`, `/auth/me`, invalid login |
| Admin RBAC | Member → 403 on `/api/admin/demo-requests`; promote to `admin` → 200; forged JWT sub → 403 |
| Demo | Weekday slots; double `POST /api/demo/book` → second **409 SLOT_TAKEN** |
| Public waitlist | Skipped if `LANDING_API_KEY` unset; otherwise 401 without key, 200 with key |

## 4. Issues found & fixes applied

| Issue | Fix |
|-------|-----|
| Proxies without `/api` had no demo routes | **`app.use("/demo", demoPublicRouter)`** alongside `/api/demo` (same as `/admin`). |
| Chat widget 500 responses leaked raw `Error.message` to clients | **`chat.routes.ts`** — generic `error` strings + `req.log?.error` for all four `catch` blocks. |
| Demo booking test sent invalid `time` when API returned `HH:MM:SS` | Test now sends **`time` as `HH:MM`** via `slice(0, 5)`. |

## 5. Response envelope `{ success, data, error }`

**Not rolled out globally.** Existing clients (admin, mobile, FollowUp) rely on current shapes (`user` + tokens, `{ error, message }`, arrays, etc.). Changing every handler would be a breaking major release. **`ENDPOINTS.md`** documents the current reality; a future ADR could define migration.

## 6. Frontend integration (verified in repo)

| App | Integration |
|-----|-------------|
| **apps/admin** | `VITE_BACKEND_URL` + `apiUrl()` strips `/api` when backend is `api.curvvtech.in`; uses `/auth/*` and `/admin/*` in that mode. |
| **apps/followup-web** | Demo booking uses **same-origin** `/api/demo/*` (Next.js + Neon), not `NEXT_PUBLIC_API_URL`. |
| **apps/website** | Uses its own Next/API patterns; not covered by this API test file. |

## 7. Remaining risks

1. **`npm run build` (`tsc`)** in `services/api` still reports pre-existing typing issues (e.g. `express-rate-limit` vs Express 5 types in `demo.routes.ts`). Runtime and Vitest are fine; CI should use `vitest` or fix `tsc` separately.
2. **Production `api.curvvtech.in`** must run a build that includes **`/admin`** and **`/demo`** mounts and redeploy.
3. **Public waitlist tests** skip without `LANDING_API_KEY` — set in CI secrets to run them.
4. **Rate limits / idempotency** on v1 leads and AI routes are not exhaustively fuzz-tested.

## 8. Logging

Request logging is already applied via `withRequestLogger()` in `createApp()`. Chat errors now log with structured `req.log?.error`.
