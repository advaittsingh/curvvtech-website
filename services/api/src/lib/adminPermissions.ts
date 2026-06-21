/** Server-side permission matrix — mirrors apps/admin/src/lib/permissions.ts */

export type AdminRole =
  | "super_admin"
  | "admin"
  | "sales"
  | "project_manager"
  | "developer"
  | "designer"
  | "accountant";

export type Permission =
  | "dashboard.view"
  | "leads.view"
  | "leads.edit"
  | "clients.view"
  | "clients.edit"
  | "projects.view"
  | "projects.edit"
  | "invoices.view"
  | "invoices.edit"
  | "proposals.view"
  | "proposals.edit"
  | "content.view"
  | "content.edit"
  | "team.manage"
  | "settings.manage";

const ALL: Permission[] = [
  "dashboard.view",
  "leads.view",
  "leads.edit",
  "clients.view",
  "clients.edit",
  "projects.view",
  "projects.edit",
  "invoices.view",
  "invoices.edit",
  "proposals.view",
  "proposals.edit",
  "content.view",
  "content.edit",
  "team.manage",
  "settings.manage",
];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ALL,
  admin: ALL.filter((p) => p !== "settings.manage"),
  sales: ["dashboard.view", "leads.view", "leads.edit", "clients.view", "clients.edit", "proposals.view", "proposals.edit"],
  project_manager: ["dashboard.view", "clients.view", "projects.view", "projects.edit", "invoices.view", "team.manage"],
  developer: ["dashboard.view", "projects.view", "projects.edit"],
  designer: ["dashboard.view", "projects.view", "content.view"],
  accountant: ["dashboard.view", "invoices.view", "invoices.edit", "clients.view"],
};

const BACKEND_ROLE_ALIASES: Record<string, AdminRole> = {
  admin: "super_admin",
  manager: "admin",
  member: "developer",
  super_admin: "super_admin",
  sales: "sales",
  project_manager: "project_manager",
  developer: "developer",
  designer: "designer",
  accountant: "accountant",
};

export function normalizeAdminRole(raw: string | null | undefined): AdminRole | null {
  if (!raw) return null;
  return BACKEND_ROLE_ALIASES[raw.trim().toLowerCase()] ?? null;
}

export function permissionsForRole(role: AdminRole | null): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(
  permissions: Permission[],
  required: Permission | Permission[],
  mode: "any" | "all" = "any",
): boolean {
  const list = Array.isArray(required) ? required : [required];
  if (list.length === 0) return true;
  if (mode === "all") return list.every((p) => permissions.includes(p));
  return list.some((p) => permissions.includes(p));
}
