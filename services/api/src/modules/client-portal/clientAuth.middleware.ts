import type { NextFunction, Request, Response } from "express";
import { config } from "../../config.js";
import { sql, firstRow } from "../../lib/sqlPool.js";
import { logger } from "../../logger.js";
import { verifyClientAccessToken } from "./clientTokens.js";
import {
  clientPermissionsForRole,
  normalizeClientRole,
  type ClientPermission,
  type ClientRole,
} from "../../lib/clientPermissions.js";

export type OrganizationBranding = {
  logo_url?: string;
  favicon_url?: string;
  brand_color?: string;
  accent_color?: string;
  text_color?: string;
  company_name?: string;
};

export type ClientPortalContext = {
  organizationId: string;
  clientId: string;
  clientUserId: string;
  email: string;
  role: ClientRole;
  permissions: ClientPermission[];
  branding: OrganizationBranding;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      portalCtx?: ClientPortalContext;
    }
  }
}

type ClientUserRow = {
  id: string;
  organization_id: string;
  client_id: string;
  email: string;
  role: string;
  status: string;
  branding_json: OrganizationBranding | null;
};

/** Verify client JWT (typ='client'), load fresh client_users row, build portal context. */
export async function requireClientAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!config.clientJwtSecret) {
      res.status(503).json({ error: "AUTH_NOT_CONFIGURED", message: "Client portal auth not configured" });
      return;
    }
    const h = req.headers.authorization;
    const token = typeof h === "string" && h.startsWith("Bearer ") ? h.slice(7).trim() : "";
    if (!token) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Authorization header must be: Bearer <token>" });
      return;
    }

    let sub: string;
    try {
      const claims = verifyClientAccessToken(token, config.clientJwtSecret);
      sub = claims.sub;
    } catch {
      res.status(401).json({ error: "INVALID_TOKEN", message: "Invalid or expired token" });
      return;
    }

    const row = firstRow<ClientUserRow>(
      await sql`
        SELECT cu.id, cu.organization_id, cu.client_id, cu.email, cu.role, cu.status,
               o.branding_json
        FROM client_users cu
        JOIN organizations o ON o.id = cu.organization_id
        WHERE cu.id = ${sub}
        LIMIT 1
      `,
    );

    if (!row) {
      res.status(403).json({ error: "FORBIDDEN", message: "Client user not found" });
      return;
    }
    if (row.status !== "active") {
      res.status(403).json({ error: "FORBIDDEN", message: "Account is not active" });
      return;
    }

    const role = normalizeClientRole(row.role);
    req.portalCtx = {
      organizationId: row.organization_id,
      clientId: row.client_id,
      clientUserId: row.id,
      email: row.email,
      role,
      permissions: clientPermissionsForRole(role),
      branding: row.branding_json ?? {},
    };
    next();
  } catch (e) {
    logger.warn({ err: e }, "client_auth_failed");
    res.status(401).json({ error: "INVALID_TOKEN", message: "Invalid or expired token" });
  }
}

type PermissionRule = { prefix: string; view: ClientPermission; edit?: ClientPermission };

const RULES: PermissionRule[] = [
  { prefix: "/dashboard", view: "portal.dashboard.view" },
  { prefix: "/workspace", view: "portal.dashboard.view" },
  { prefix: "/journal", view: "portal.dashboard.view" },
  { prefix: "/deliverables", view: "portal.files.view" },
  { prefix: "/notifications", view: "portal.dashboard.view" },
  { prefix: "/projects", view: "portal.projects.view", edit: "portal.revisions.request" },
  { prefix: "/tasks", view: "portal.tasks.view", edit: "portal.tasks.complete" },
  { prefix: "/files", view: "portal.files.view", edit: "portal.files.upload" },
  { prefix: "/invoices", view: "portal.invoices.view", edit: "portal.invoices.pay" },
  { prefix: "/payments", view: "portal.invoices.view" },
  { prefix: "/billing", view: "portal.invoices.view", edit: "portal.invoices.pay" },
  { prefix: "/proposals", view: "portal.projects.view", edit: "portal.approvals.act" },
  { prefix: "/approvals", view: "portal.approvals.act", edit: "portal.approvals.act" },
  { prefix: "/conversations", view: "portal.support.message", edit: "portal.support.message" },
  { prefix: "/meetings", view: "portal.projects.view" },
  { prefix: "/feedback", view: "portal.dashboard.view", edit: "portal.dashboard.view" },
  { prefix: "/profile", view: "portal.profile.edit", edit: "portal.profile.edit" },
  { prefix: "/team", view: "portal.team.manage", edit: "portal.team.manage" },
  { prefix: "/ai", view: "portal.support.message", edit: "portal.support.message" },
];

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/** Route-prefix → permission gate (mirror of enforceAdminPermissions). */
export function enforceClientPermissions(req: Request, res: Response, next: NextFunction): void {
  const ctx = req.portalCtx;
  if (!ctx) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Portal context required" });
    return;
  }
  const path = req.path;
  const rule = RULES.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
  if (!rule) {
    next();
    return;
  }
  const isWrite = WRITE_METHODS.has(req.method);
  const required = isWrite ? rule.edit ?? rule.view : rule.view;
  if (!ctx.permissions.includes(required)) {
    res.status(403).json({ error: "FORBIDDEN", message: `Missing permission: ${required}` });
    return;
  }
  next();
}
