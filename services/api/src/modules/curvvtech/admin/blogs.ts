import { Router } from 'express'
import { sql } from '../../../lib/sqlPool.js'
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

export default router
