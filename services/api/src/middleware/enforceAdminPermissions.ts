import type { NextFunction, Request, Response } from "express";
import { hasPermission, type Permission } from "../lib/adminPermissions.js";

type RouteRule = { prefix: string; view: Permission; edit?: Permission; manage?: Permission };

const RULES: RouteRule[] = [
  { prefix: "/analytics", view: "dashboard.view" },
  { prefix: "/leads", view: "leads.view", edit: "leads.edit" },
  { prefix: "/demo-requests", view: "leads.view", edit: "leads.edit" },
  { prefix: "/chats", view: "leads.view", edit: "leads.edit" },
  { prefix: "/ai-calls", view: "leads.edit", edit: "leads.edit" },
  { prefix: "/clients", view: "clients.view", edit: "clients.edit" },
  { prefix: "/projects", view: "projects.view", edit: "projects.edit" },
  { prefix: "/tasks", view: "projects.view", edit: "projects.edit" },
  { prefix: "/files", view: "projects.view", edit: "projects.edit" },
  { prefix: "/proposals", view: "proposals.view", edit: "proposals.edit" },
  { prefix: "/invoices", view: "invoices.view", edit: "invoices.edit" },
  { prefix: "/expenses", view: "invoices.view", edit: "invoices.edit" },
  { prefix: "/payroll", view: "invoices.view", edit: "invoices.edit" },
  { prefix: "/blogs", view: "content.view", edit: "content.edit" },
  { prefix: "/content", view: "content.view", edit: "content.edit" },
  { prefix: "/team", view: "team.manage", manage: "team.manage" },
  { prefix: "/workflows", view: "settings.manage", manage: "settings.manage" },
  { prefix: "/operations", view: "settings.manage", manage: "settings.manage" },
  { prefix: "/integrations", view: "settings.manage", manage: "settings.manage" },
  { prefix: "/company", view: "settings.manage", manage: "settings.manage" },
  { prefix: "/ai", view: "dashboard.view", edit: "dashboard.view" },
];

function adminRelativePath(req: Request): string {
  const base = req.baseUrl.replace(/\/api\/admin$|\/admin$/, "");
  const path = `${base}${req.path}`.replace(/\/api\/admin|\/admin/, "") || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Enforce module permissions after requireCurvvtechAdmin sets req.adminPermissions. */
export function enforceAdminPermissions(req: Request, res: Response, next: NextFunction): void {
  const perms = req.adminPermissions;
  if (!perms?.length) {
    res.status(403).json({ error: "FORBIDDEN", message: "No permissions" });
    return;
  }

  const rel = adminRelativePath(req);
  const rule = RULES.find((r) => rel === r.prefix || rel.startsWith(`${r.prefix}/`));
  if (!rule) {
    next();
    return;
  }

  const isWrite = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);
  const required = rule.manage ?? (isWrite ? (rule.edit ?? rule.view) : rule.view);

  if (!hasPermission(perms, required)) {
    res.status(403).json({ error: "FORBIDDEN", message: `Requires permission: ${required}` });
    return;
  }
  next();
}
