import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

// Read-only revenue & SaaS metrics (from DB; Stripe sync can be added later)
router.get('/revenue', async (_req, res) => {
  try {
    
    const inv = firstRow(await sql`
      SELECT
        COALESCE(SUM(amount_cents), 0)::bigint as total_revenue_cents,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0)::bigint as paid_cents,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count
      FROM invoices
    `)
    const subs = firstRow(await sql`
      SELECT COUNT(*)::int as active_subscriptions
      FROM subscriptions
      WHERE status IN ('active', 'trialing') AND (current_period_end IS NULL OR current_period_end > NOW())
    `)
    res.json({
      total_revenue_cents: Number((inv as any)?.total_revenue_cents ?? 0),
      paid_revenue_cents: Number((inv as any)?.paid_cents ?? 0),
      invoices_paid: (inv as any)?.paid_count ?? 0,
      invoices_sent: (inv as any)?.sent_count ?? 0,
      invoices_draft: (inv as any)?.draft_count ?? 0,
      active_subscriptions: (subs as any)?.active_subscriptions ?? 0,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
