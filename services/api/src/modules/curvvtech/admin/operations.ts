import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/sops', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT s.*,
        (SELECT json_agg(json_build_object('id', st.id, 'sort_order', st.sort_order, 'title', st.title, 'description', st.description, 'auto_create_task', st.auto_create_task) ORDER BY st.sort_order)
         FROM sop_steps st WHERE st.sop_id = s.id) AS steps
      FROM sops s ORDER BY s.title ASC
    `
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/sops', async (req, res) => {
  try {
    const { title, category, description, project_type, steps } = req.body
    const sop = firstRow<{ id: string }>(await sql`
      INSERT INTO sops (title, category, description, project_type)
      VALUES (${title ?? 'SOP'}, ${category ?? 'general'}, ${description ?? null}, ${project_type ?? null})
      RETURNING *
    `)
    if (Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i]
        await sql`
          INSERT INTO sop_steps (sop_id, sort_order, title, description, auto_create_task)
          VALUES (${sop!.id}, ${i}, ${st.title ?? ''}, ${st.description ?? null}, ${st.auto_create_task !== false})
        `
      }
    }
    res.status(201).json(sop)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/sops/:id/run', async (req, res) => {
  try {
    const auth = req.auth!
    const { project_id, lead_id } = req.body
    const steps = await sql`
      SELECT title, description FROM sop_steps WHERE sop_id = ${req.params.id}::uuid ORDER BY sort_order ASC
    `
    const created: string[] = []
    for (const st of steps as { title: string; description: string | null }[]) {
      const row = firstRow<{ id: string }>(await sql`
        INSERT INTO tasks (title, description, project_id, lead_id, assignee_user_id, status)
        VALUES (${st.title}, ${st.description ?? null}, ${project_id ?? null}, ${lead_id ?? null}, ${auth.sub}, 'todo')
        RETURNING id::text AS id
      `)
      if (row?.id) created.push(row.id)
    }
    res.json({ ok: true, tasks_created: created.length, task_ids: created })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/knowledge', async (_req, res) => {
  try {
    const rows = await sql`SELECT id, title, slug, category, published, "updatedAt" FROM knowledge_articles ORDER BY "updatedAt" DESC`
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/knowledge/:id', async (req, res) => {
  try {
    const row = firstRow(await sql`SELECT * FROM knowledge_articles WHERE id = ${req.params.id}::uuid`)
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(row)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/knowledge', async (req, res) => {
  try {
    const auth = req.auth!
    const { title, slug, category, body, published } = req.body
    const row = firstRow(await sql`
      INSERT INTO knowledge_articles (title, slug, category, body, published, author_user_id)
      VALUES (${title ?? ''}, ${slug ?? title ?? ''}, ${category ?? 'general'}, ${body ?? ''}, ${published !== false}, ${auth.sub})
      RETURNING *
    `)
    res.status(201).json(row)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/knowledge/:id', async (req, res) => {
  try {
    const { title, category, body, published } = req.body
    const { id } = req.params
    if (title !== undefined) await sql`UPDATE knowledge_articles SET title = ${title}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (category !== undefined) await sql`UPDATE knowledge_articles SET category = ${category}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body !== undefined) await sql`UPDATE knowledge_articles SET body = ${body}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (published !== undefined) await sql`UPDATE knowledge_articles SET published = ${published}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    res.json(firstRow(await sql`SELECT * FROM knowledge_articles WHERE id = ${id}::uuid`))
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/knowledge/:id', async (req, res) => {
  try {
    await sql`DELETE FROM knowledge_articles WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
