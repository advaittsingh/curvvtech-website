import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { isRestrictedProjectRole } from '../../../lib/adminPermissions.js'
import { emitActivityEvent } from '../../shared/activity/emitActivityEvent.js'

const router = Router()
router.use(requireCurvvtechAdmin)

const STATUSES = ['todo', 'in_progress', 'review', 'done'] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const TASK_SELECT = `
  SELECT
    t.*,
    p.name AS project_name,
    u.email AS assignee_email,
    COALESCE(NULLIF(up.display_name, ''), u.email) AS assignee_name
  FROM tasks t
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN users u ON u.id::text = t.assignee_user_id
  LEFT JOIN user_profiles up ON up.user_id = u.id
`

async function listTasks(whereSql: string, params: unknown[], orderBy: string): Promise<unknown[]> {
  const r = await pool.query(`${TASK_SELECT} ${whereSql} ORDER BY ${orderBy}`, params)
  return r.rows
}

async function logTaskActivity(
  authSub: string,
  action: string,
  taskId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await sql`
    INSERT INTO activity_logs (clerk_user_id, action, entity_type, entity_id, details)
    VALUES (${authSub}, ${action}, 'task', ${taskId}, ${JSON.stringify(details)}::jsonb)
  `
}

type TaskScope = {
  projectId: string | null
  organizationId: string
  clientId: string | null
};

async function resolveTaskScope(projectId: string | null): Promise<TaskScope | null> {
  if (projectId) {
    const project = firstRow<TaskScope>(await sql`
      SELECT id::text AS "projectId", organization_id::text AS "organizationId",
        client_id::text AS "clientId"
      FROM projects WHERE id = ${projectId}::uuid
    `);
    return project?.organizationId ? project : null;
  }
  const org = firstRow<{ id: string }>(await sql`
    SELECT id::text FROM organizations
    ORDER BY (slug = 'curvvtech') DESC, created_at ASC
    LIMIT 1
  `);
  return org ? { projectId: null, organizationId: org.id, clientId: null } : null;
}

async function validateAssignee(
  assigneeUserId: string | null,
  projectId: string | null,
): Promise<string | null> {
  if (!assigneeUserId) return null;
  const user = firstRow<{ id: string }>(await sql`
    SELECT id::text FROM users
    WHERE id = ${assigneeUserId}::uuid AND curvvtech_role IS NOT NULL
  `);
  if (!user) return "Assignee must be an active staff user";
  if (projectId) {
    const member = firstRow(await sql`
      SELECT 1 FROM project_members
      WHERE project_id = ${projectId}::uuid AND user_id = ${assigneeUserId}::uuid
    `);
    if (!member) return "Assignee must belong to the selected project";
  }
  return null;
}

async function emitAssignmentEvent(opts: {
  eventType: "task.assigned" | "task.reassigned" | "task.commented";
  taskId: string;
  title: string;
  assigneeUserId: string;
  scope: TaskScope;
  actorId: string;
  actorName?: string;
}): Promise<void> {
  await emitActivityEvent({
    organizationId: opts.scope.organizationId,
    clientId: opts.scope.clientId,
    projectId: opts.scope.projectId,
    actorType: "staff",
    actorId: opts.actorId,
    actorName: opts.actorName,
    eventType: opts.eventType,
    entityType: "task",
    entityId: opts.taskId,
    title:
      opts.eventType === "task.assigned"
        ? `Task assigned: ${opts.title}`
        : opts.eventType === "task.reassigned"
          ? `Task reassigned: ${opts.title}`
          : `New comment: ${opts.title}`,
    metadata: { recipient_user_id: opts.assigneeUserId },
    visibility: "private",
  });
}

router.get('/summary', async (req, res) => {
  try {
    const restricted = isRestrictedProjectRole(req.adminRole)
    const summaryResult = await pool.query<{
      total: number
      due_today: number
      in_review: number
      overdue: number
      due_this_week: number
      completed: number
    }>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE t.due_at IS NOT NULL
            AND t.due_at::date = CURRENT_DATE
            AND t.status <> 'done'
        )::int AS due_today,
        COUNT(*) FILTER (WHERE t.status = 'review')::int AS in_review,
        COUNT(*) FILTER (
          WHERE t.due_at IS NOT NULL
            AND t.due_at < NOW()
            AND t.status <> 'done'
        )::int AS overdue,
        COUNT(*) FILTER (
          WHERE t.due_at IS NOT NULL
            AND t.due_at >= date_trunc('week', CURRENT_DATE)
            AND t.due_at < date_trunc('week', CURRENT_DATE) + interval '7 days'
            AND t.status <> 'done'
        )::int AS due_this_week,
        COUNT(*) FILTER (WHERE t.status = 'done')::int AS completed
      FROM tasks t
      ${restricted ? 'WHERE t.assignee_user_id = $1' : ''}
    `, restricted ? [req.auth!.sub] : [])
    const row = summaryResult.rows[0]
    const total = Number(row?.total ?? 0)
    const completed = Number(row?.completed ?? 0)
    res.json({
      total,
      due_today: Number(row?.due_today ?? 0),
      in_review: Number(row?.in_review ?? 0),
      overdue: Number(row?.overdue ?? 0),
      due_this_week: Number(row?.due_this_week ?? 0),
      completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const restricted = isRestrictedProjectRole(req.adminRole)
    const result = await pool.query(`
      SELECT
        al.id::text,
        al.action,
        al.entity_id,
        al.details,
        al."createdAt"::text AS created_at,
        al.clerk_user_id,
        u.email AS actor_email,
        COALESCE(NULLIF(up.display_name, ''), u.email) AS actor_name,
        t.title AS task_title,
        p.name AS project_name
      FROM activity_logs al
      LEFT JOIN users u ON u.id::text = al.clerk_user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN tasks t ON t.id::text = al.entity_id AND al.entity_type = 'task'
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE (al.entity_type = 'task'
         OR al.action IN ('task_created', 'task_status_changed', 'task_completed', 'plan_generated'))
        ${restricted ? 'AND t.assignee_user_id = $1' : ''}
      ORDER BY al."createdAt" DESC
      LIMIT $${restricted ? 2 : 1}
    `, restricted ? [req.auth!.sub, limit] : [limit])
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/mine', async (req, res) => {
  try {
    const rows = await listTasks(
      'WHERE t.assignee_user_id = $1',
      [req.auth!.sub],
      't.due_at ASC NULLS LAST, t."updatedAt" DESC',
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (req, res) => {
  try {
    const { project_id, assignee_user_id, status, priority, view } = req.query
    let rows: unknown[]
    if (isRestrictedProjectRole(req.adminRole)) {
      const clauses = ['t.assignee_user_id = $1']
      const params: unknown[] = [req.auth!.sub]
      if (project_id) {
        params.push(String(project_id))
        clauses.push(`t.project_id = $${params.length}::uuid`)
      }
      if (status) {
        params.push(String(status))
        clauses.push(`t.status = $${params.length}`)
      }
      if (priority) {
        params.push(String(priority))
        clauses.push(`t.priority = $${params.length}`)
      }
      if (view === 'calendar') clauses.push('t.due_at IS NOT NULL')
      rows = await listTasks(`WHERE ${clauses.join(' AND ')}`, params, 't.due_at ASC NULLS LAST, t."updatedAt" DESC')
    } else if (view === 'calendar') {
      rows = await listTasks('WHERE t.due_at IS NOT NULL', [], 't.due_at ASC')
    } else if (project_id) {
      rows = await listTasks('WHERE t.project_id = $1::uuid', [String(project_id)], 't.due_at ASC NULLS LAST, t."updatedAt" DESC')
    } else if (assignee_user_id) {
      rows = await listTasks('WHERE t.assignee_user_id = $1', [String(assignee_user_id)], 't.due_at ASC NULLS LAST')
    } else if (status && priority) {
      rows = await listTasks('WHERE t.status = $1 AND t.priority = $2', [String(status), String(priority)], 't."updatedAt" DESC')
    } else if (status) {
      rows = await listTasks('WHERE t.status = $1', [String(status)], 't."updatedAt" DESC')
    } else if (priority) {
      rows = await listTasks('WHERE t.priority = $1', [String(priority)], 't."updatedAt" DESC')
    } else {
      rows = await listTasks('', [], 't."updatedAt" DESC')
    }
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    if (isRestrictedProjectRole(req.adminRole)) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Restricted staff cannot create tasks' })
      return
    }
    const auth = req.auth!
    const { title, description, project_id, lead_id, status, priority, assignee_user_id, due_at } = req.body
    const projectId = project_id ? String(project_id) : null
    const assigneeUserId = assignee_user_id ? String(assignee_user_id) : null
    if ((projectId && !UUID_RE.test(projectId)) || (assigneeUserId && !UUID_RE.test(assigneeUserId))) {
      res.status(400).json({ error: 'Invalid project_id or assignee_user_id' })
      return
    }
    const scope = await resolveTaskScope(projectId)
    if (!scope) {
      res.status(400).json({ error: projectId ? 'Project not found or has no organization' : 'Organization not configured' })
      return
    }
    const assigneeError = await validateAssignee(assigneeUserId, projectId)
    if (assigneeError) {
      res.status(400).json({ error: assigneeError })
      return
    }
    const row = firstRow<{ id: string }>(await sql`
      INSERT INTO tasks (
        organization_id, title, description, project_id, lead_id, status, priority, assignee_user_id, due_at
      )
      VALUES (
        ${scope.organizationId}::uuid,
        ${title ?? ''},
        ${description ?? null},
        ${projectId}::uuid,
        ${lead_id ?? null},
        ${status ?? 'todo'},
        ${priority ?? 'medium'},
        ${assigneeUserId},
        ${due_at ?? null}
      )
      RETURNING *
    `)
    await logTaskActivity(auth.sub, 'task_created', row!.id, { title, status: status ?? 'todo', priority: priority ?? 'medium' })
    if (assigneeUserId) {
      await emitAssignmentEvent({
        eventType: 'task.assigned',
        taskId: row!.id,
        title: String(title ?? ''),
        assigneeUserId,
        scope,
        actorId: auth.sub,
        actorName: auth.email,
      })
    }
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: 'Invalid task id' })
      return
    }
    const task = firstRow<{ assignee_user_id: string | null }>(await sql`
      SELECT assignee_user_id FROM tasks WHERE id = ${id}::uuid
    `)
    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }
    if (isRestrictedProjectRole(req.adminRole) && task.assignee_user_id !== req.auth!.sub) {
      res.status(404).json({ error: 'Task not found' })
      return
    }
    const rows = await sql`
      SELECT
        tc.id::text,
        tc.task_id::text,
        tc.author_user_id::text,
        tc.body,
        tc.created_at::text,
        COALESCE(NULLIF(up.display_name, ''), u.email, 'Team member') AS author_name
      FROM task_comments tc
      JOIN users u ON u.id = tc.author_user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE tc.task_id = ${id}::uuid
      ORDER BY tc.created_at ASC
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/comments', async (req, res) => {
  try {
    const auth = req.auth!
    const { id } = req.params
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: 'Invalid task id' })
      return
    }
    if (!body || body.length > 4000) {
      res.status(400).json({ error: 'Comment must be between 1 and 4000 characters' })
      return
    }
    const task = firstRow<{
      title: string
      assignee_user_id: string | null
      project_id: string | null
    }>(await sql`
      SELECT title, assignee_user_id, project_id::text
      FROM tasks WHERE id = ${id}::uuid
    `)
    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }
    if (isRestrictedProjectRole(req.adminRole) && task.assignee_user_id !== auth.sub) {
      res.status(404).json({ error: 'Task not found' })
      return
    }
    const row = firstRow<{
      id: string
      task_id: string
      author_user_id: string
      body: string
      created_at: string
    }>(await sql`
      INSERT INTO task_comments (task_id, author_user_id, body)
      VALUES (${id}::uuid, ${auth.sub}::uuid, ${body})
      RETURNING id::text, task_id::text, author_user_id::text, body, created_at::text
    `)
    await logTaskActivity(auth.sub, 'task_commented', id, { title: task.title })
    if (task.assignee_user_id && task.assignee_user_id !== auth.sub) {
      const scope = await resolveTaskScope(task.project_id)
      if (scope) {
        await emitAssignmentEvent({
          eventType: 'task.commented',
          taskId: id,
          title: task.title,
          assigneeUserId: task.assignee_user_id,
          scope,
          actorId: auth.sub,
          actorName: auth.email,
        })
      }
    }
    res.status(201).json({ ...row!, author_name: auth.email })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const auth = req.auth!
    const { id } = req.params
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: 'Invalid task id' })
      return
    }
    const { title, description, status, priority, assignee_user_id, due_at, project_id } = req.body

    const existing = firstRow<{
      id: string
      status: string
      title: string
      assignee_user_id: string | null
      project_id: string | null
    }>(
      await sql`
        SELECT id::text, status, title, assignee_user_id, project_id::text
        FROM tasks WHERE id = ${id}::uuid
      `,
    )
    if (!existing) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    if (isRestrictedProjectRole(req.adminRole)) {
      const keys = Object.keys(req.body ?? {})
      if (existing.assignee_user_id !== auth.sub || keys.length !== 1 || keys[0] !== 'status') {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Restricted staff may only change status on their own assigned tasks',
        })
        return
      }
    }

    const finalProjectId =
      project_id === undefined ? existing.project_id : project_id ? String(project_id) : null
    const finalAssigneeUserId =
      assignee_user_id === undefined
        ? existing.assignee_user_id
        : assignee_user_id
          ? String(assignee_user_id)
          : null
    if (
      (finalProjectId && !UUID_RE.test(finalProjectId)) ||
      (finalAssigneeUserId && !UUID_RE.test(finalAssigneeUserId))
    ) {
      res.status(400).json({ error: 'Invalid project_id or assignee_user_id' })
      return
    }
    const scope = await resolveTaskScope(finalProjectId)
    if (!scope) {
      res.status(400).json({ error: finalProjectId ? 'Project not found or has no organization' : 'Organization not configured' })
      return
    }
    if (assignee_user_id !== undefined || project_id !== undefined) {
      const assigneeError = await validateAssignee(finalAssigneeUserId, finalProjectId)
      if (assigneeError) {
        res.status(400).json({ error: assigneeError })
        return
      }
    }

    if (title !== undefined) await sql`UPDATE tasks SET title = ${title}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (description !== undefined) await sql`UPDATE tasks SET description = ${description}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        res.status(400).json({ error: 'Invalid status' })
        return
      }
      if (status === 'done') {
        await sql`UPDATE tasks SET status = ${status}, completed_at = NOW(), "updatedAt" = NOW() WHERE id = ${id}::uuid`
        if (existing.status !== 'done') {
          await logTaskActivity(auth.sub, 'task_completed', id, { title: existing.title, from: existing.status, to: status })
        }
      } else {
        await sql`UPDATE tasks SET status = ${status}, completed_at = NULL, "updatedAt" = NOW() WHERE id = ${id}::uuid`
        if (existing.status !== status) {
          await logTaskActivity(auth.sub, 'task_status_changed', id, { title: existing.title, from: existing.status, to: status })
        }
      }
    }
    if (priority !== undefined) await sql`UPDATE tasks SET priority = ${priority}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (assignee_user_id !== undefined) await sql`UPDATE tasks SET assignee_user_id = ${finalAssigneeUserId}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (due_at !== undefined) await sql`UPDATE tasks SET due_at = ${due_at}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (project_id !== undefined) {
      await sql`
        UPDATE tasks
        SET project_id = ${finalProjectId}::uuid,
          organization_id = ${scope.organizationId}::uuid,
          "updatedAt" = NOW()
        WHERE id = ${id}::uuid
      `
    }

    if (
      assignee_user_id !== undefined &&
      finalAssigneeUserId &&
      finalAssigneeUserId !== existing.assignee_user_id
    ) {
      await emitAssignmentEvent({
        eventType: existing.assignee_user_id ? 'task.reassigned' : 'task.assigned',
        taskId: id,
        title: existing.title,
        assigneeUserId: finalAssigneeUserId,
        scope,
        actorId: auth.sub,
        actorName: auth.email,
      })
    }

    const row = firstRow(await sql`SELECT * FROM tasks WHERE id = ${id}::uuid`)
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    if (isRestrictedProjectRole(req.adminRole)) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Restricted staff cannot delete tasks' })
      return
    }
    await sql`DELETE FROM tasks WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
