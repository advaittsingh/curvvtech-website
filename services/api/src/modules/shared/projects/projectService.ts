import { sql, firstRow } from "../../../lib/sqlPool.js";
import type { ClientPortalContext } from "../../client-portal/clientAuth.middleware.js";

export type ProjectPerson = {
  id: string;
  name: string;
  role: string;
};

export type ClientProjectDTO = {
  id: string;
  name: string;
  status: string;
  progress_pct: number;
  current_phase: string | null;
  start_date: string | null;
  target_end_date: string | null;
  completed_at: string | null;
  live_url: string | null;
  priority: string | null;
  color: string | null;
  delivery_phases: unknown;
  project_manager: ProjectPerson | null;
  created_at: string;
  updated_at: string;
};

type ProjectRow = ClientProjectDTO & Record<string, unknown>;

function toClientProject(row: ProjectRow): ClientProjectDTO {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    progress_pct: Number(row.progress_pct ?? 0),
    current_phase: row.current_phase,
    start_date: row.start_date,
    target_end_date: row.target_end_date,
    completed_at: row.completed_at,
    live_url: row.live_url,
    priority: row.priority,
    color: row.color,
    delivery_phases: row.delivery_phases,
    project_manager: (row.project_manager as ProjectPerson | null) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Humanise a raw member role into a client-facing label. */
function prettyRole(role?: string | null): string {
  const r = String(role ?? "").toLowerCase();
  if (r.includes("manager") || r === "pm" || r.includes("lead")) return "Project Manager";
  if (r.includes("design")) return "Designer";
  if (r.includes("dev") || r.includes("engineer")) return "Developer";
  if (r.includes("qa") || r.includes("test")) return "QA Engineer";
  if (!r || r === "member") return "Team member";
  return role!.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve the project's lead / manager as a client-facing person. Prefers the
 * explicit `manager_user_id`, then falls back to a member with a manager-like
 * role. Returns null when nobody is assigned.
 */
export async function getProjectManagerForClient(projectId: string): Promise<ProjectPerson | null> {
  const row = firstRow<{ id: string; name: string | null; email: string | null; role: string | null }>(
    await sql`
      SELECT u.id::text AS id,
             NULLIF(up.display_name, '') AS name,
             u.email AS email,
             COALESCE(pm.role, 'project_manager') AS role
      FROM projects p
      JOIN users u ON u.id = p.manager_user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = u.id
      WHERE p.id = ${projectId}
      LIMIT 1
    `,
  );
  const resolved = row ?? firstRow<{ id: string; name: string | null; email: string | null; role: string | null }>(
    await sql`
      SELECT u.id::text AS id,
             NULLIF(up.display_name, '') AS name,
             u.email AS email,
             pm.role AS role
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE pm.project_id = ${projectId}
        AND pm.role IN ('manager', 'project_manager', 'lead')
      ORDER BY u.email ASC
      LIMIT 1
    `,
  );
  if (!resolved) return null;
  const displayName = resolved.name || (resolved.email ? resolved.email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Project Manager");
  return { id: resolved.id, name: displayName, role: prettyRole(resolved.role) };
}

export async function listProjectsForClient(ctx: ClientPortalContext): Promise<ClientProjectDTO[]> {
  const result = (await sql`
    SELECT id, name, status, progress_pct, current_phase, start_date, target_end_date,
           completed_at, live_url, priority, color, delivery_phases,
           "createdAt" AS created_at, "updatedAt" AS updated_at
    FROM projects
    WHERE client_id = ${ctx.clientId}
      AND organization_id = ${ctx.organizationId}
      AND COALESCE(is_internal, false) = false
      AND archived_at IS NULL
    ORDER BY "updatedAt" DESC
  `) as ProjectRow[];
  return result.map(toClientProject);
}

export async function getProjectForClient(
  ctx: ClientPortalContext,
  projectId: string,
): Promise<ClientProjectDTO | null> {
  const row = firstRow<ProjectRow>(
    await sql`
      SELECT id, name, status, progress_pct, current_phase, start_date, target_end_date,
             completed_at, live_url, priority, color, delivery_phases,
             "createdAt" AS created_at, "updatedAt" AS updated_at
      FROM projects
      WHERE id = ${projectId}
        AND client_id = ${ctx.clientId}
        AND organization_id = ${ctx.organizationId}
        AND COALESCE(is_internal, false) = false
      LIMIT 1
    `,
  );
  if (!row) return null;
  const project = toClientProject(row);
  project.project_manager = await getProjectManagerForClient(project.id);
  return project;
}

/** Ownership guard — returns true if the project belongs to this client. */
export async function assertProjectOwnership(
  ctx: ClientPortalContext,
  projectId: string,
): Promise<boolean> {
  const row = firstRow<{ id: string }>(
    await sql`
      SELECT id FROM projects
      WHERE id = ${projectId} AND client_id = ${ctx.clientId} AND organization_id = ${ctx.organizationId}
      LIMIT 1
    `,
  );
  return Boolean(row);
}

export async function getMilestonesForClient(ctx: ClientPortalContext, projectId: string) {
  if (!(await assertProjectOwnership(ctx, projectId))) return null;
  return (await sql`
    SELECT id, title, description, due_at, completed_at, completion_pct, status
    FROM milestones
    WHERE project_id = ${projectId} AND visibility = 'client'
    ORDER BY due_at ASC NULLS LAST, "createdAt" ASC
  `) as unknown[];
}

export async function getScopeForClient(ctx: ClientPortalContext, projectId: string) {
  if (!(await assertProjectOwnership(ctx, projectId))) return null;
  return (await sql`
    SELECT id, category, title, description, sort_order
    FROM project_scope_items
    WHERE project_id = ${projectId} AND visibility = 'client'
    ORDER BY sort_order ASC, "createdAt" ASC
  `) as unknown[];
}

export async function getRevisionsForClient(ctx: ClientPortalContext, projectId: string) {
  if (!(await assertProjectOwnership(ctx, projectId))) return null;
  return (await sql`
    SELECT id, revision_number, description, status, approved, approved_at, "createdAt" AS created_at
    FROM project_revisions
    WHERE project_id = ${projectId} AND visibility IN ('client')
    ORDER BY "createdAt" DESC
  `) as unknown[];
}

export async function getTeamForClient(ctx: ClientPortalContext, projectId: string) {
  if (!(await assertProjectOwnership(ctx, projectId))) return null;
  const rows = (await sql`
    SELECT u.id::text AS id,
           COALESCE(u.email, 'Team member') AS email,
           NULLIF(up.display_name, '') AS name,
           pm.role,
           (p.manager_user_id = u.id) AS is_manager
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    JOIN projects p ON p.id = pm.project_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE pm.project_id = ${projectId}
    ORDER BY
      (p.manager_user_id = u.id) DESC,
      CASE WHEN pm.role IN ('manager', 'project_manager', 'lead') THEN 0 ELSE 1 END,
      u.email ASC
  `) as { id: string; email: string; name: string | null; role: string | null; is_manager: boolean }[];
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name || r.email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    role: r.role,
    role_label: prettyRole(r.role),
    is_manager: Boolean(r.is_manager) || String(r.role ?? "").match(/manager|lead|pm/i) != null,
  }));
}
