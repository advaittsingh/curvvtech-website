/** Client Portal RBAC — separate from staff adminPermissions. */

export type ClientRole = "owner" | "manager" | "finance" | "viewer";

export type ClientPermission =
  | "portal.dashboard.view"
  | "portal.projects.view"
  | "portal.tasks.view"
  | "portal.tasks.complete"
  | "portal.files.view"
  | "portal.files.upload"
  | "portal.invoices.view"
  | "portal.invoices.pay"
  | "portal.approvals.act"
  | "portal.revisions.request"
  | "portal.support.message"
  | "portal.team.manage"
  | "portal.profile.edit";

const OWNER: ClientPermission[] = [
  "portal.dashboard.view",
  "portal.projects.view",
  "portal.tasks.view",
  "portal.tasks.complete",
  "portal.files.view",
  "portal.files.upload",
  "portal.invoices.view",
  "portal.invoices.pay",
  "portal.approvals.act",
  "portal.revisions.request",
  "portal.support.message",
  "portal.team.manage",
  "portal.profile.edit",
];

export const CLIENT_ROLE_PERMISSIONS: Record<ClientRole, ClientPermission[]> = {
  owner: OWNER,
  manager: [
    "portal.dashboard.view",
    "portal.projects.view",
    "portal.tasks.view",
    "portal.tasks.complete",
    "portal.files.view",
    "portal.files.upload",
    "portal.invoices.view",
    "portal.approvals.act",
    "portal.revisions.request",
    "portal.support.message",
    "portal.profile.edit",
  ],
  finance: [
    "portal.dashboard.view",
    "portal.projects.view",
    "portal.tasks.view",
    "portal.files.view",
    "portal.invoices.view",
    "portal.invoices.pay",
    "portal.support.message",
    "portal.profile.edit",
  ],
  viewer: [
    "portal.dashboard.view",
    "portal.projects.view",
    "portal.tasks.view",
    "portal.files.view",
    "portal.support.message",
    "portal.profile.edit",
  ],
};

export function normalizeClientRole(raw: string | null | undefined): ClientRole {
  const r = (raw ?? "").trim().toLowerCase();
  if (r === "owner" || r === "manager" || r === "finance" || r === "viewer") return r;
  return "viewer";
}

export function clientPermissionsForRole(role: ClientRole): ClientPermission[] {
  return CLIENT_ROLE_PERMISSIONS[role];
}

export function hasClientPermission(
  permissions: ClientPermission[],
  required: ClientPermission,
): boolean {
  return permissions.includes(required);
}
