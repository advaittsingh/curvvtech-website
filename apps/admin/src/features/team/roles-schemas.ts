import type { AdminRole, Permission } from "@/types/auth";
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, permissionsForRole } from "@/lib/permissions";

export type PermissionModule = {
  id: string;
  label: string;
  view: Permission;
  edit?: Permission | null;
};

export type PermissionGroup = {
  id: string;
  label: string;
  modules: PermissionModule[];
};

export type AccessLevel = "Full" | "Edit" | "View" | "None";

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "sales",
    label: "Sales",
    modules: [
      { id: "leads", label: "Leads", view: "leads.view", edit: "leads.edit" },
      { id: "clients", label: "Clients", view: "clients.view", edit: "clients.edit" },
      { id: "proposals", label: "Proposals", view: "proposals.view", edit: "proposals.edit" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    modules: [
      { id: "dashboard", label: "Dashboard", view: "dashboard.view", edit: null },
      { id: "projects", label: "Projects & Tasks", view: "projects.view", edit: "projects.edit" },
      { id: "files", label: "Files", view: "projects.view", edit: "projects.edit" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    modules: [
      { id: "invoices", label: "Invoices", view: "invoices.view", edit: "invoices.edit" },
      { id: "payments", label: "Payments", view: "invoices.view", edit: "invoices.edit" },
      { id: "expenses", label: "Expenses", view: "invoices.view", edit: "invoices.edit" },
      { id: "payroll", label: "Payroll", view: "invoices.view", edit: "invoices.edit" },
    ],
  },
  {
    id: "content",
    label: "Content",
    modules: [{ id: "cms", label: "CMS & Blogs", view: "content.view", edit: "content.edit" }],
  },
  {
    id: "people",
    label: "People",
    modules: [
      { id: "team", label: "Team & Roles", view: "team.manage", edit: "team.manage" },
      { id: "settings", label: "Settings", view: "settings.manage", edit: "settings.manage" },
    ],
  },
];

export const ROLE_CATALOG: AdminRole[] = [
  "super_admin",
  "admin",
  "project_manager",
  "developer",
  "designer",
  "sales",
  "accountant",
];

export const ROLE_META: Record<
  AdminRole,
  { label: string; description: string; accessTag: string; department: string }
> = {
  super_admin: {
    label: "Founder / Admin",
    description: "Full access to every module, team management, and system settings.",
    accessTag: "Full access",
    department: "Leadership",
  },
  admin: {
    label: "Admin",
    description: "Manages operations, finance, content, and team — without destructive system settings.",
    accessTag: "Full operations",
    department: "Operations",
  },
  sales: {
    label: "Sales",
    description: "Can work leads, clients, and proposals. Cannot access finance or payroll modules.",
    accessTag: "Sales modules",
    department: "Sales",
  },
  project_manager: {
    label: "Project Manager",
    description: "Runs client projects, tasks, and files. Can view invoices and manage team assignments.",
    accessTag: "Project operations",
    department: "Operations",
  },
  developer: {
    label: "Developer",
    description: "Can access assigned projects, tasks, and files. No finance or admin modules.",
    accessTag: "Project delivery",
    department: "Engineering",
  },
  designer: {
    label: "Designer",
    description: "Can access creative project work and content assets. Limited operational access.",
    accessTag: "Creative modules",
    department: "Design",
  },
  accountant: {
    label: "Accountant",
    description: "Full finance module access with client visibility. No sales pipeline or team admin.",
    accessTag: "Finance modules",
    department: "Finance",
  },
};

export type RolesSummary = {
  role_count: number;
  member_count: number;
  permission_count: number;
  department_count: number;
};

export type RoleCardData = {
  role: AdminRole;
  label: string;
  description: string;
  accessTag: string;
  department: string;
  member_count: number;
  permission_count: number;
};

export type RolesAiInsight = {
  insight: string;
  recommended_action: string;
  risk_level: "low" | "medium" | "high";
};

export type RolesDashboard = {
  summary: RolesSummary;
  roles: RoleCardData[];
  ai_insight: RolesAiInsight;
};

export function moduleAccessLevel(permissions: Permission[], mod: PermissionModule): AccessLevel {
  const hasView = permissions.includes(mod.view);
  const hasEdit = mod.edit ? permissions.includes(mod.edit) : false;
  if (!mod.edit) return hasView ? "View" : "None";
  if (hasView && hasEdit) return "Full";
  if (hasEdit) return "Edit";
  if (hasView) return "View";
  return "None";
}

export function accessLevelBadge(level: AccessLevel): string {
  switch (level) {
    case "Full":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Edit":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "View":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-stone-100 text-stone-500 border-stone-200";
  }
}

export function permissionsForRoleExport(role: AdminRole): Permission[] {
  return permissionsForRole(role);
}

export { ALL_PERMISSIONS, ROLE_PERMISSIONS };
