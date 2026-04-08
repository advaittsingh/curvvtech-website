import type { NextFunction, Request, Response } from "express";
import { pool } from "../db.js";
import { forbidden, badRequest } from "../lib/errors.js";

export type TenantRole = "admin" | "agent";

/** Requires `authenticate` first. Resolves tenant from `X-Tenant-Id` or single membership. */
export async function resolveTenantContext(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.internalUser?.id;
    if (!userId) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
      return;
    }

    const r = await pool.query<{ tenant_id: string; role: TenantRole }>(
      `SELECT tenant_id::text, role::text AS role FROM tenant_users WHERE user_id = $1`,
      [userId]
    );

    if (r.rows.length === 0) {
      return next(forbidden("No organization membership"));
    }

    const header = req.header("x-tenant-id")?.trim();
    let tenantId = header || undefined;

    if (!tenantId && r.rows.length === 1) {
      tenantId = r.rows[0]!.tenant_id;
    }

    if (!tenantId) {
      return next(badRequest("X-Tenant-Id header is required when you belong to multiple organizations"));
    }

    const row = r.rows.find((x) => x.tenant_id === tenantId);
    if (!row) {
      return next(forbidden("You do not have access to this organization"));
    }

    req.tenantId = tenantId;
    req.tenantRole = row.role;
    req.log = req.log?.child({ tenant_id: tenantId }) ?? req.log;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireTenantRole(...roles: TenantRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantRole || !roles.includes(req.tenantRole)) {
      res.status(403).json({ error: "FORBIDDEN", message: "Insufficient role" });
      return;
    }
    next();
  };
}
