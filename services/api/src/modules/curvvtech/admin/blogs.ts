import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/', async (_req, res) => {
  try {
    
    const rows = await sql`
      SELECT b.*, bc.name as category_name
      FROM blogs b
      LEFT JOIN blog_categories bc ON b.category_id = bc.id
      ORDER BY b."updatedAt" DESC
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { title, slug, excerpt, body, meta_title, meta_description, featured_image_url, status, category_id } = req.body
    
    const result = await sql`
      INSERT INTO blogs (title, slug, excerpt, body, meta_title, meta_description, featured_image_url, status, category_id, "updatedAt", "createdAt")
      VALUES (${title ?? ''}, ${slug ?? ''}, ${excerpt ?? null}, ${body ?? null}, ${meta_title ?? null}, ${meta_description ?? null}, ${featured_image_url ?? null}, ${status ?? 'draft'}, ${category_id ?? null}, NOW(), NOW())
      RETURNING *
    `
    res.status(201).json((result as any[])[0])
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/categories', async (_req, res) => {
  try {
    
    const rows = await sql`SELECT * FROM blog_categories ORDER BY name`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/tags', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM blog_tags ORDER BY name`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = firstRow(await sql`SELECT * FROM blogs WHERE id = ${req.params.id}::uuid`)
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const b = req.body
    if (b.title !== undefined) await sql`UPDATE blogs SET title = ${b.title}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.slug !== undefined) await sql`UPDATE blogs SET slug = ${b.slug}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.excerpt !== undefined) await sql`UPDATE blogs SET excerpt = ${b.excerpt}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.body !== undefined) await sql`UPDATE blogs SET body = ${b.body}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.meta_title !== undefined) await sql`UPDATE blogs SET meta_title = ${b.meta_title}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.meta_description !== undefined) await sql`UPDATE blogs SET meta_description = ${b.meta_description}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.featured_image_url !== undefined) await sql`UPDATE blogs SET featured_image_url = ${b.featured_image_url}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.status !== undefined) await sql`UPDATE blogs SET status = ${b.status}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.category_id !== undefined) await sql`UPDATE blogs SET category_id = ${b.category_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    res.json(firstRow(await sql`SELECT * FROM blogs WHERE id = ${id}::uuid`))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await sql`DELETE FROM blogs WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
