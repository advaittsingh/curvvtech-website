import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/', async (_req, res) => {
  try {
    const row = firstRow(await sql`SELECT * FROM company_settings ORDER BY "createdAt" ASC LIMIT 1`)
    res.json(row ?? {})
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/', async (req, res) => {
  try {
    const b = req.body
    const existing = firstRow(await sql`SELECT id FROM company_settings LIMIT 1`)
    if (!existing) {
      const row = firstRow(await sql`
        INSERT INTO company_settings (company_name) VALUES (${b.company_name ?? 'CurvvTech'}) RETURNING *
      `)
      res.json(row)
      return
    }
    if (b.company_name !== undefined) await sql`UPDATE company_settings SET company_name = ${b.company_name}, "updatedAt" = NOW()`
    if (b.tax_id !== undefined) await sql`UPDATE company_settings SET tax_id = ${b.tax_id}, "updatedAt" = NOW()`
    if (b.gst_number !== undefined) await sql`UPDATE company_settings SET gst_number = ${b.gst_number}, "updatedAt" = NOW()`
    if (b.address !== undefined) await sql`UPDATE company_settings SET address = ${b.address}, "updatedAt" = NOW()`
    if (b.phone !== undefined) await sql`UPDATE company_settings SET phone = ${b.phone}, "updatedAt" = NOW()`
    if (b.cash_in_bank_cents !== undefined) await sql`UPDATE company_settings SET cash_in_bank_cents = ${b.cash_in_bank_cents}, "updatedAt" = NOW()`
    if (b.logo_url !== undefined) await sql`UPDATE company_settings SET logo_url = ${b.logo_url}, "updatedAt" = NOW()`
    if (b.brand_color !== undefined) await sql`UPDATE company_settings SET brand_color = ${b.brand_color}, "updatedAt" = NOW()`
    if (b.email_from !== undefined) await sql`UPDATE company_settings SET email_from = ${b.email_from}, "updatedAt" = NOW()`
    if (b.smtp_host !== undefined) await sql`UPDATE company_settings SET smtp_host = ${b.smtp_host}, "updatedAt" = NOW()`
    if (b.smtp_port !== undefined) await sql`UPDATE company_settings SET smtp_port = ${b.smtp_port}, "updatedAt" = NOW()`
    if (b.smtp_user !== undefined) await sql`UPDATE company_settings SET smtp_user = ${b.smtp_user}, "updatedAt" = NOW()`
    if (b.smtp_pass !== undefined) await sql`UPDATE company_settings SET smtp_pass = ${b.smtp_pass}, "updatedAt" = NOW()`
    res.json(firstRow(await sql`SELECT * FROM company_settings LIMIT 1`))
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/sessions', async (req, res) => {
  try {
    const auth = req.auth!
    const rows = await sql`
      SELECT id::text, user_agent, ip_address, last_seen_at, "createdAt"
      FROM admin_sessions WHERE user_id = ${auth.sub}::uuid ORDER BY last_seen_at DESC LIMIT 20
    `
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
