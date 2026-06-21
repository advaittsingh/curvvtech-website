import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

const STATUSES = ['todo', 'in_progress', 'review', 'done'] as const

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

router.get('/summary', async (_req, res) => {
  try {
    const row = firstRow<{
      total: number
      due_today: number
      in_review: number
      overdue: number
      due_this_week: number
      completed: number
    }>(await sql`
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
    `)
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
    const rows = await sql`
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
      WHERE al.entity_type = 'task'
         OR al.action IN ('task_created', 'task_status_changed', 'task_completed', 'plan_generated')
      ORDER BY al."createdAt" DESC
      LIMIT ${limit}
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (req, res) => {
  try {
    const { project_id, assignee_user_id, status, priority, view } = req.query
    let rows: unknown[]
    if (view === 'calendar') {
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
    const auth = req.auth!
    const { title, description, project_id, lead_id, status, priority, assignee_user_id, due_at } = req.body
    const row = firstRow<{ id: string }>(await sql`
      INSERT INTO tasks (title, description, project_id, lead_id, status, priority, assignee_user_id, due_at)
      VALUES (
        ${title ?? ''},
        ${description ?? null},
        ${project_id ?? null},
        ${lead_id ?? null},
        ${status ?? 'todo'},
        ${priority ?? 'medium'},
        ${assignee_user_id ?? null},
        ${due_at ?? null}
      )
      RETURNING *
    `)
    await logTaskActivity(auth.sub, 'task_created', row!.id, { title, status: status ?? 'todo', priority: priority ?? 'medium' })
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const auth = req.auth!
    const { id } = req.params
    const { title, description, status, priority, assignee_user_id, due_at, project_id } = req.body

    const existing = firstRow<{ id: string; status: string; title: string }>(
      await sql`SELECT id, status, title FROM tasks WHERE id = ${id}::uuid`,
    )
    if (!existing) {
      res.status(404).json({ error: 'Task not found' })
      return
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
    if (assignee_user_id !== undefined) await sql`UPDATE tasks SET assignee_user_id = ${assignee_user_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (due_at !== undefined) await sql`UPDATE tasks SET due_at = ${due_at}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (project_id !== undefined) await sql`UPDATE tasks SET project_id = ${project_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`

    const row = firstRow(await sql`SELECT * FROM tasks WHERE id = ${id}::uuid`)
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await sql`DELETE FROM tasks WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
