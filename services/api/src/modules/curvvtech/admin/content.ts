import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/services', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM cms_services ORDER BY sort_order ASC, title ASC`
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/services', async (req, res) => {
  try {
    const { title, slug, description, icon, sort_order, published } = req.body
    const row = firstRow(await sql`
      INSERT INTO cms_services (title, slug, description, icon, sort_order, published)
      VALUES (${title ?? ''}, ${slug ?? title ?? ''}, ${description ?? null}, ${icon ?? null}, ${sort_order ?? 0}, ${published !== false})
      RETURNING *
    `)
    res.status(201).json(row)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/services/:id', async (req, res) => {
  try {
    const { id } = req.params
    const b = req.body
    if (b.title !== undefined) await sql`UPDATE cms_services SET title = ${b.title}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.slug !== undefined) await sql`UPDATE cms_services SET slug = ${b.slug}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.description !== undefined) await sql`UPDATE cms_services SET description = ${b.description}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.published !== undefined) await sql`UPDATE cms_services SET published = ${b.published}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.seo_title !== undefined) await sql`UPDATE cms_services SET seo_title = ${b.seo_title}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.seo_description !== undefined) await sql`UPDATE cms_services SET seo_description = ${b.seo_description}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.hero_image_url !== undefined) await sql`UPDATE cms_services SET hero_image_url = ${b.hero_image_url}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.content_json !== undefined) await sql`UPDATE cms_services SET content_json = ${JSON.stringify(b.content_json)}::jsonb, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    res.json(firstRow(await sql`SELECT * FROM cms_services WHERE id = ${id}::uuid`))
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/services/:id', async (req, res) => {
  try {
    await sql`DELETE FROM cms_services WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/portfolio', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM cms_portfolio ORDER BY sort_order ASC, title ASC`
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/portfolio', async (req, res) => {
  try {
    const { title, slug, description, image_url, project_url, tags, sort_order, published } = req.body
    const row = firstRow(await sql`
      INSERT INTO cms_portfolio (title, slug, description, image_url, project_url, tags, sort_order, published)
      VALUES (${title ?? ''}, ${slug ?? title ?? ''}, ${description ?? null}, ${image_url ?? null}, ${project_url ?? null}, ${Array.isArray(tags) ? tags : []}, ${sort_order ?? 0}, ${published !== false})
      RETURNING *
    `)
    res.status(201).json(row)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/portfolio/:id', async (req, res) => {
  try {
    const { id } = req.params
    const b = req.body
    if (b.title !== undefined) await sql`UPDATE cms_portfolio SET title = ${b.title}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.description !== undefined) await sql`UPDATE cms_portfolio SET description = ${b.description}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.published !== undefined) await sql`UPDATE cms_portfolio SET published = ${b.published}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.case_study_body !== undefined) await sql`UPDATE cms_portfolio SET case_study_body = ${b.case_study_body}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.metrics_json !== undefined) await sql`UPDATE cms_portfolio SET metrics_json = ${JSON.stringify(b.metrics_json)}::jsonb, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.before_image_url !== undefined) await sql`UPDATE cms_portfolio SET before_image_url = ${b.before_image_url}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.after_image_url !== undefined) await sql`UPDATE cms_portfolio SET after_image_url = ${b.after_image_url}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    res.json(firstRow(await sql`SELECT * FROM cms_portfolio WHERE id = ${id}::uuid`))
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/portfolio/:id', async (req, res) => {
  try {
    await sql`DELETE FROM cms_portfolio WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/** Public read for website */
router.get('/public/services', async (_req, res) => {
  try {
    const rows = await sql`SELECT title, slug, description, icon FROM cms_services WHERE published = true ORDER BY sort_order ASC`
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/public/portfolio', async (_req, res) => {
  try {
    const rows = await sql`SELECT title, slug, description, image_url, project_url, tags FROM cms_portfolio WHERE published = true ORDER BY sort_order ASC`
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/testimonials', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM cms_testimonials ORDER BY sort_order ASC, name ASC`
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/testimonials', async (req, res) => {
  try {
    const { name, company, review, rating, image_url, published, sort_order } = req.body
    const row = firstRow(await sql`
      INSERT INTO cms_testimonials (name, company, review, rating, image_url, published, sort_order)
      VALUES (${name ?? ''}, ${company ?? null}, ${review ?? ''}, ${rating ?? 5}, ${image_url ?? null}, ${published !== false}, ${sort_order ?? 0})
      RETURNING *
    `)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/testimonials/:id', async (req, res) => {
  try {
    const { id } = req.params
    const b = req.body
    if (b.name !== undefined) await sql`UPDATE cms_testimonials SET name = ${b.name}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.company !== undefined) await sql`UPDATE cms_testimonials SET company = ${b.company}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.review !== undefined) await sql`UPDATE cms_testimonials SET review = ${b.review}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.rating !== undefined) await sql`UPDATE cms_testimonials SET rating = ${b.rating}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.published !== undefined) await sql`UPDATE cms_testimonials SET published = ${b.published}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    res.json(firstRow(await sql`SELECT * FROM cms_testimonials WHERE id = ${id}::uuid`))
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/testimonials/:id', async (req, res) => {
  try {
    await sql`DELETE FROM cms_testimonials WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/team-members', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM cms_team_members ORDER BY sort_order ASC, name ASC`
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/team-members', async (req, res) => {
  try {
    const { name, position, bio, photo_url, linkedin_url, published, sort_order } = req.body
    const row = firstRow(await sql`
      INSERT INTO cms_team_members (name, position, bio, photo_url, linkedin_url, published, sort_order)
      VALUES (${name ?? ''}, ${position ?? null}, ${bio ?? null}, ${photo_url ?? null}, ${linkedin_url ?? null}, ${published !== false}, ${sort_order ?? 0})
      RETURNING *
    `)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/team-members/:id', async (req, res) => {
  try {
    const { id } = req.params
    const b = req.body
    if (b.name !== undefined) await sql`UPDATE cms_team_members SET name = ${b.name}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.position !== undefined) await sql`UPDATE cms_team_members SET position = ${b.position}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.bio !== undefined) await sql`UPDATE cms_team_members SET bio = ${b.bio}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (b.published !== undefined) await sql`UPDATE cms_team_members SET published = ${b.published}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    res.json(firstRow(await sql`SELECT * FROM cms_team_members WHERE id = ${id}::uuid`))
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/team-members/:id', async (req, res) => {
  try {
    await sql`DELETE FROM cms_team_members WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
