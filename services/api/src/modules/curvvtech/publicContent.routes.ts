import { Router } from 'express'
import { sql } from '../../lib/sqlPool.js'

const router = Router()

router.get('/services', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT title, slug, description, icon, hero_image_url, seo_title, seo_description, content_json
      FROM cms_services WHERE published = true ORDER BY sort_order ASC, title ASC
    `
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/portfolio', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT title, slug, description, image_url, project_url, tags, case_study_body, metrics_json, before_image_url, after_image_url, seo_title, seo_description
      FROM cms_portfolio WHERE published = true ORDER BY sort_order ASC, title ASC
    `
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/testimonials', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT name, company, review, rating, image_url
      FROM cms_testimonials WHERE published = true ORDER BY sort_order ASC, name ASC
    `
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/team', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT name, position, bio, photo_url, linkedin_url
      FROM cms_team_members WHERE published = true ORDER BY sort_order ASC, name ASC
    `
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/blogs', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT b.id, b.title, b.slug, b.excerpt, b.body, b.meta_title, b.meta_description, b.featured_image_url, b."updatedAt", bc.name AS category_name
      FROM blogs b
      LEFT JOIN blog_categories bc ON b.category_id = bc.id
      WHERE b.status = 'published'
      ORDER BY b."updatedAt" DESC
    `
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/blogs/:slug', async (req, res) => {
  try {
    const rows = await sql`
      SELECT b.*, bc.name AS category_name
      FROM blogs b
      LEFT JOIN blog_categories bc ON b.category_id = bc.id
      WHERE b.slug = ${req.params.slug} AND b.status = 'published'
      LIMIT 1
    `
    const row = (rows as unknown[])[0]
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(row)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
