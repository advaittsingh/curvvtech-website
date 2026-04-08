import { Router } from "express";
import { sql } from "../../../lib/sqlPool.js";
import { requireCurvvtechAdmin } from "../../../middleware/requireCurvvtechAdmin.js";

const router = Router();
router.use(requireCurvvtechAdmin);

router.get("/members", async (_req, res) => {
  try {
    const rows = await sql`
      SELECT id::text AS user_id, email, curvvtech_role AS role
      FROM users
      ORDER BY email ASC NULLS LAST
    `;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/roles", async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM roles ORDER BY name`;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** Set Curvvtech dashboard role (admin | manager | member | null). */
router.patch("/members/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { curvvtech_role } = req.body as { curvvtech_role?: string | null };
    if (curvvtech_role === undefined) {
      res.status(400).json({ error: "curvvtech_role required" });
      return;
    }
    const norm =
      curvvtech_role === "" || curvvtech_role === null ? null : String(curvvtech_role).toLowerCase();
    if (norm !== null && !["admin", "manager", "member"].includes(norm)) {
      res.status(400).json({ error: "Invalid curvvtech_role" });
      return;
    }
    await sql`
      UPDATE users SET curvvtech_role = ${norm}, updated_at = now()
      WHERE id = ${userId}::uuid
    `;
    const rows = await sql`
      SELECT id::text AS user_id, email, curvvtech_role AS role FROM users WHERE id = ${userId}::uuid
    `;
    res.json((rows as { user_id: string; email: string | null; role: string | null }[])[0] ?? {});
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/activity", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rows = await sql`
      SELECT * FROM activity_logs ORDER BY "createdAt" DESC LIMIT ${limit}
    `;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/activity", async (req, res) => {
  try {
    const auth = req.auth!;
    const { action, entity_type, entity_id, details } = req.body;
    const rows = await sql`
      INSERT INTO activity_logs (clerk_user_id, action, entity_type, entity_id, details, "createdAt")
      VALUES (${auth.sub}, ${action ?? "activity"}, ${entity_type ?? null}, ${entity_id ?? null}, ${details ? JSON.stringify(details) : null}::jsonb, NOW())
      RETURNING *
    `;
    res.status(201).json((rows as object[])[0]!);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
