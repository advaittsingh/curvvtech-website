import { sql, firstRow } from "../../../lib/sqlPool.js";
import type { ClientPortalContext } from "../../client-portal/clientAuth.middleware.js";
import { assertProjectOwnership } from "../projects/projectService.js";

export type ClientTaskDTO = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  completed_at: string | null;
  project_id: string | null;
  /** True when the client can mark this task complete (visibility = client). */
  client_actionable?: boolean;
};

export type ProjectTaskProgress = {
  project_id: string;
  total: number;
  done: number;
  remaining: number;
  client_visible_total: number;
  client_visible_open: number;
};

type TaskRow = ClientTaskDTO & Record<string, unknown>;

function toClientTask(row: TaskRow & { visibility?: string }): ClientTaskDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    due_at: row.due_at,
    completed_at: row.completed_at,
    project_id: row.project_id,
    client_actionable: row.visibility === "client",
  };
}

/** All project tasks for client progress tracking; only client-visible tasks are actionable. */
export async function listTasksForClient(
  ctx: ClientPortalContext,
  projectId: string,
): Promise<ClientTaskDTO[] | null> {
  if (!(await assertProjectOwnership(ctx, projectId))) return null;
  const rows = (await sql`
    SELECT id, title, description, status, priority, due_at, completed_at, project_id, visibility
    FROM tasks
    WHERE project_id = ${projectId}
    ORDER BY
      CASE WHEN status = 'done' THEN 1 ELSE 0 END,
      due_at ASC NULLS LAST,
      "createdAt" ASC
  `) as TaskRow[];
  return rows.map(toClientTask);
}

/** Aggregate task progress for a project (all tasks for done/left; client-visible for actionable list). */
export async function getProjectTaskProgress(
  ctx: ClientPortalContext,
  projectId: string,
): Promise<ProjectTaskProgress | null> {
  if (!(await assertProjectOwnership(ctx, projectId))) return null;
  const row = firstRow<{
    total: number;
    done: number;
    client_visible_total: number;
    client_visible_open: number;
  }>(
    await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'done')::int AS done,
        COUNT(*) FILTER (WHERE visibility = 'client')::int AS client_visible_total,
        COUNT(*) FILTER (WHERE visibility = 'client' AND status <> 'done')::int AS client_visible_open
      FROM tasks
      WHERE project_id = ${projectId}
    `,
  );
  if (!row) return null;
  return {
    project_id: projectId,
    total: row.total,
    done: row.done,
    remaining: Math.max(0, row.total - row.done),
    client_visible_total: row.client_visible_total,
    client_visible_open: row.client_visible_open,
  };
}

export async function listProjectTaskProgressForClient(
  ctx: ClientPortalContext,
): Promise<ProjectTaskProgress[]> {
  const rows = (await sql`
    SELECT
      p.id AS project_id,
      COUNT(t.id)::int AS total,
      COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS done,
      COUNT(t.id) FILTER (WHERE t.visibility = 'client')::int AS client_visible_total,
      COUNT(t.id) FILTER (WHERE t.visibility = 'client' AND t.status <> 'done')::int AS client_visible_open
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.client_id = ${ctx.clientId}
      AND p.organization_id = ${ctx.organizationId}
      AND COALESCE(p.is_internal, false) = false
      AND p.archived_at IS NULL
    GROUP BY p.id
    ORDER BY p."updatedAt" DESC
  `) as Array<{
    project_id: string;
    total: number;
    done: number;
    client_visible_total: number;
    client_visible_open: number;
  }>;
  return rows.map((r) => ({
    project_id: r.project_id,
    total: r.total,
    done: r.done,
    remaining: Math.max(0, r.total - r.done),
    client_visible_total: r.client_visible_total,
    client_visible_open: r.client_visible_open,
  }));
}

/** Client marks a visible task complete. Returns updated task or null if not permitted. */
export async function completeTaskForClient(
  ctx: ClientPortalContext,
  taskId: string,
): Promise<ClientTaskDTO | null> {
  const owned = firstRow<TaskRow & { organization_id: string }>(
    await sql`
      SELECT t.id, t.project_id, t.organization_id
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ${taskId}
        AND t.visibility = 'client'
        AND p.client_id = ${ctx.clientId}
        AND p.organization_id = ${ctx.organizationId}
      LIMIT 1
    `,
  );
  if (!owned) return null;
  const row = firstRow<TaskRow>(
    await sql`
      UPDATE tasks
      SET status = 'done', completed_at = now(), "updatedAt" = now()
      WHERE id = ${taskId}
      RETURNING id, title, description, status, priority, due_at, completed_at, project_id
    `,
  );
  return row ? toClientTask(row) : null;
}
