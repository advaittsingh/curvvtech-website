import type { NextFunction, Request, Response } from "express";
import { pool } from "../../../db.js";
import { AppError } from "../../../lib/errors.js";

export type BosOrganization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      bosOrg?: BosOrganization;
    }
  }
}

export async function resolveOrganization(req: Request, _res: Response, next: NextFunction) {
  try {
    const userId = req.internalUser?.id ?? req.auth?.sub;
    if (!userId) throw new AppError(401, "UNAUTHORIZED", "Authentication required");

    const headerOrg = req.headers["x-organization-id"];
    const paramOrg = typeof req.params.orgId === "string" ? req.params.orgId : "";
    const orgId = paramOrg || (typeof headerOrg === "string" ? headerOrg.trim() : "");

    let row;
    if (orgId) {
      const r = await pool.query(
        `SELECT o.id, o.name, o.slug, o.plan, m.role
         FROM bos_organizations o
         JOIN bos_organization_members m ON m.organization_id = o.id
         WHERE o.id = $1 AND m.user_id = $2`,
        [orgId, userId]
      );
      row = r.rows[0];
    } else {
      const r = await pool.query(
        `SELECT o.id, o.name, o.slug, o.plan, m.role
         FROM bos_organizations o
         JOIN bos_organization_members m ON m.organization_id = o.id
         WHERE m.user_id = $1
         ORDER BY o.created_at ASC
         LIMIT 1`,
        [userId]
      );
      row = r.rows[0];
    }

    if (!row) throw new AppError(404, "NOT_FOUND", "No organization found for this user");

    req.bosOrg = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
      role: row.role,
    };
    next();
  } catch (e) {
    next(e);
  }
}

export function requireOrgRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.bosOrg) return next(new AppError(401, "UNAUTHORIZED", "Organization context required"));
    if (roles.length && !roles.includes(req.bosOrg.role)) {
      return next(new AppError(403, "FORBIDDEN", "Insufficient permissions"));
    }
    next();
  };
}
