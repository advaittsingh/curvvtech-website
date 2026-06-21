import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT w.*,
        (SELECT json_agg(json_build_object('id', a.id, 'step_order', a.step_order, 'action_type', a.action_type, 'action_config', a.action_config) ORDER BY a.step_order)
         FROM curvvtech_workflow_actions a WHERE a.workflow_id = w.id) AS actions
      FROM curvvtech_workflows w
      ORDER BY w."createdAt" DESC
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, trigger_type, trigger_config, enabled, actions } = req.body
    const wf = firstRow<{ id: string }>(await sql`
      INSERT INTO curvvtech_workflows (name, trigger_type, trigger_config, enabled)
      VALUES (${name ?? 'Workflow'}, ${trigger_type}, ${JSON.stringify(trigger_config ?? {})}::jsonb, ${enabled !== false})
      RETURNING *
    `)
    if (Array.isArray(actions)) {
      for (const a of actions) {
        await sql`
          INSERT INTO curvvtech_workflow_actions (workflow_id, step_order, action_type, action_config)
          VALUES (${wf!.id}, ${a.step_order ?? 0}, ${a.action_type}, ${JSON.stringify(a.action_config ?? {})}::jsonb)
        `
      }
    }
    res.status(201).json(wf)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { name, trigger_type, trigger_config, enabled, actions } = req.body
    const { id } = req.params
    if (name !== undefined) await sql`UPDATE curvvtech_workflows SET name = ${name}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (trigger_type !== undefined) await sql`UPDATE curvvtech_workflows SET trigger_type = ${trigger_type}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (trigger_config !== undefined) await sql`UPDATE curvvtech_workflows SET trigger_config = ${JSON.stringify(trigger_config)}::jsonb, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (enabled !== undefined) await sql`UPDATE curvvtech_workflows SET enabled = ${enabled}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (Array.isArray(actions)) {
      await sql`DELETE FROM curvvtech_workflow_actions WHERE workflow_id = ${id}::uuid`
      for (const a of actions) {
        await sql`
          INSERT INTO curvvtech_workflow_actions (workflow_id, step_order, action_type, action_config)
          VALUES (${id}::uuid, ${a.step_order ?? 0}, ${a.action_type}, ${JSON.stringify(a.action_config ?? {})}::jsonb)
        `
      }
    }
    res.json(firstRow(await sql`SELECT * FROM curvvtech_workflows WHERE id = ${id}::uuid`))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/runs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200)
    const rows = await sql`
      SELECT r.*, w.name AS workflow_name
      FROM curvvtech_workflow_runs r
      JOIN curvvtech_workflows w ON w.id = r.workflow_id
      ORDER BY r."createdAt" DESC
      LIMIT ${limit}
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await sql`DELETE FROM curvvtech_workflows WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
