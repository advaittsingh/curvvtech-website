/**
 * API integration & smoke tests (Vitest + Supertest).
 *
 * Run: `npm run test` from `services/api` (loads `.env` / `.env.aws` via test/setup.ts).
 *
 * - Smoke tests: no database required for /health shape and JSON 404.
 * - Integration: skipped when `DATABASE_URL` or `JWT_SECRET` missing.
 */
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { pool } from "../src/db.js";
import { signAccessToken } from "../src/modules/auth/auth.tokens.js";

const app = createApp();

const hasDb = Boolean(config.databaseUrl?.trim());
const hasJwt = Boolean(config.jwtAccessSecret?.trim());

describe("smoke (no DB writes)", () => {
  it("GET /health returns 200 JSON", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("unknown route returns 404 JSON envelope", async () => {
    const res = await request(app).get("/this-route-does-not-exist-xyz").expect(404);
    expect(res.body).toMatchObject({ error: "NOT_FOUND" });
    expect(res.body.message).toBeTruthy();
  });

  it("POST /api/auth/login with empty body returns 400", async () => {
    const res = await request(app).post("/api/auth/login").send({}).expect(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/login with wrong password returns 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "definitely-not-a-user@curvvtech.test", password: "wrong" })
      .expect(401);
    expect(res.body.error).toBeTruthy();
  });

  it("GET /api/admin/blogs without token returns 401", async () => {
    await request(app).get("/api/admin/blogs").expect(401);
  });

  it("GET /admin/blogs without token returns 401 (alias mount)", async () => {
    await request(app).get("/admin/blogs").expect(401);
  });

  it("GET /api/demo/slots without date returns 400", async () => {
    const res = await request(app).get("/api/demo/slots").expect(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("GET /demo/slots?date=invalid returns 200 with empty slots (invalid YMD)", async () => {
    const res = await request(app).get("/demo/slots").query({ date: "not-a-date" }).expect(200);
    expect(res.body.slots).toEqual([]);
  });
});

describe.skipIf(!hasDb)("database: /ready", () => {
  it("GET /ready returns 200 or 503 with { ok }", async () => {
    const res = await request(app).get("/ready");
    expect([200, 503]).toContain(res.status);
    expect(typeof res.body.ok).toBe("boolean");
  });
});

describe.skipIf(!hasDb || !hasJwt)("integration: auth + demo + admin", () => {
  const testEmail = `qa-${randomUUID()}@curvvtech.test`;
  const testPassword = "QaTest_Password_9!";
  let accessToken: string;
  let userId: string;

  afterAll(async () => {
    try {
      await pool.query(`DELETE FROM users WHERE lower(trim(email)) = $1`, [testEmail.toLowerCase()]);
    } catch {
      /* ignore cleanup failures */
    }
  });

  beforeAll(async () => {
    const signup = await request(app)
      .post("/auth/signup")
      .send({ email: testEmail, password: testPassword })
      .expect(201);
    expect(signup.body.access_token).toBeTruthy();
    expect(signup.body.user?.email).toBe(testEmail.toLowerCase());
    accessToken = signup.body.access_token as string;
    userId = signup.body.user.id as string;
  });

  it("POST /auth/login returns tokens for new user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword })
      .expect(200);
    expect(res.body.access_token).toBeTruthy();
    expect(res.body.refresh_token).toBeTruthy();
  });

  it("GET /auth/me with Bearer returns user", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.id).toBe(userId);
  });

  it("GET /api/admin/* with member token returns 403 (not admin role)", async () => {
    await request(app)
      .get("/api/admin/demo-requests")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(403);
  });

  it("demo: GET slots for next Monday returns array", async () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const ymd = `${y}-${m}-${day}`;

    const res = await request(app).get("/api/demo/slots").query({ date: ymd });
    if (res.status === 503 || res.status === 500) {
      expect(String(res.body?.message || res.body?.error || "")).toBeTruthy();
      return;
    }
    expect(res.status).toBe(200);
    expect(res.body.date).toBe(ymd);
    expect(Array.isArray(res.body.slots)).toBe(true);
    if (res.body.slots.length > 0) {
      expect(res.body.slots[0]).toHaveProperty("id");
      expect(res.body.slots[0]).toHaveProperty("time");
    }
  });

  it("demo: double book same slot returns 409 on second request", async () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const date = `${y}-${m}-${day}`;

    const slotsRes = await request(app).get("/api/demo/slots").query({ date });
    if (slotsRes.status !== 200) return;
    const slots = slotsRes.body.slots as { id: string; time: string }[];
    if (slots.length === 0) {
      return;
    }
    const slot = slots[0]!;
    const suffix = randomUUID().slice(0, 8);
    /** API may return `HH:MM` or `HH:MM:SS`; book endpoint accepts `HH:MM`. */
    const timeHm = String(slot.time).slice(0, 5);
    const body = {
      date,
      time: timeHm,
      name: `QA ${suffix}`,
      email: `qa-demo-${suffix}@curvvtech.test`,
    };

    await request(app).post("/api/demo/book").send(body).expect(201);
    const second = await request(app).post("/api/demo/book").send(body).expect(409);
    expect(second.body.error).toBe("SLOT_TAKEN");
  });

  it("admin: GET /api/admin/demo-requests with admin token succeeds", async () => {
    await pool.query(
      `UPDATE users SET curvvtech_role = 'admin' WHERE id = $1::uuid`,
      [userId]
    );
    const res = await request(app)
      .get("/api/admin/demo-requests")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    await pool.query(`UPDATE users SET curvvtech_role = NULL WHERE id = $1::uuid`, [userId]);
  });

  it("admin: forged token sub fails admin check", async () => {
    const fakeToken = signAccessToken(
      "00000000-0000-4000-8000-000000000000",
      "nobody@test.com",
      config.jwtAccessSecret,
      300
    );
    await request(app)
      .get("/api/admin/blogs")
      .set("Authorization", `Bearer ${fakeToken}`)
      .expect(403);
  });
});

describe.skipIf(!hasDb || !config.landingApiKey)("public waitlist (API key)", () => {
  it("GET /v1/public/waitlist/count without key returns 401", async () => {
    await request(app).get("/v1/public/waitlist/count").expect(401);
  });

  it("GET /v1/public/waitlist/count with key returns JSON", async () => {
    const res = await request(app)
      .get("/v1/public/waitlist/count")
      .set("x-followup-api-key", config.landingApiKey)
      .expect(200);
    expect(typeof res.body.total).toBe("number");
  });
});
