import { Router } from "express";
import { pool } from "../../db.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

export const tenantsRouter = Router();

tenantsRouter.get(
  "/tenants",
  asyncHandler(async (req, res) => {
    const userId = req.internalUser!.id;
    const r = await pool.query<{ id: string; name: string; slug: string; role: string }>(
      `SELECT t.id::text, t.name, t.slug, tu.role::text
       FROM tenant_users tu
       JOIN tenants t ON t.id = tu.tenant_id
       WHERE tu.user_id = $1::uuid
       ORDER BY t.name ASC`,
      [userId]
    );
    res.json({
      tenants: r.rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        role: row.role,
      })),
    });
  })
);
