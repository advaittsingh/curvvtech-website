import type { AdminRole, AuthUser, MeResponse, Permission } from "@/types/auth";

export const ALL_PERMISSIONS: Permission[] = [
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
  super_admin: ALL_PERMISSIONS,
  admin: [
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
  ],
  sales: [
    "dashboard.view",
    "leads.view",
    "leads.edit",
    "clients.view",
    "clients.edit",
    "proposals.view",
    "proposals.edit",
  ],
  project_manager: [
    "dashboard.view",
    "clients.view",
    "projects.view",
    "projects.edit",
    "invoices.view",
    "team.manage",
  ],
  developer: ["dashboard.view", "projects.view", "projects.edit"],
  designer: ["dashboard.view", "projects.view", "content.view"],
  accountant: ["dashboard.view", "invoices.view", "invoices.edit", "clients.view"],
};

/** Legacy `users.curvvtech_role` values and future OS role slugs. */
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

export function canAccessAdminPanel(curvvtechRole: string | null | undefined): boolean {
  return normalizeAdminRole(curvvtechRole) !== null;
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

export function toAuthUser(payload: MeResponse): AuthUser {
  const role = normalizeAdminRole(payload.curvvtech_role);
  return {
    id: payload.id,
    email: payload.email,
    accessAllowed: payload.access_allowed,
    waitlistPosition: payload.waitlist_position,
    curvvtechRole: payload.curvvtech_role,
    role,
  };
}

export function permissionsForUser(user: AuthUser | null): Permission[] {
  return permissionsForRole(user?.role ?? null);
}
