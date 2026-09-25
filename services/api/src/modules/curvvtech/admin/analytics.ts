import { Router } from "express";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import { requireCurvvtechAdmin } from "../../../middleware/requireCurvvtechAdmin.js";
import { buildDashboardOverview } from "../services/dashboardOverview.js";
import { buildCeoCommandCenter } from "../services/ceoCommandCenter.js";

const router = Router();
router.use(requireCurvvtechAdmin);

function num(v: unknown): number {
  return Number(v ?? 0);
}

router.get("/revenue", async (_req, res) => {
  try {
    const inv = firstRow(await sql`
      SELECT
        COALESCE(SUM(amount_cents), 0)::bigint as total_revenue_cents,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0)::bigint as paid_cents,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count
      FROM invoices
    `);
    const subs = firstRow(await sql`
      SELECT COUNT(*)::int as active_subscriptions
      FROM subscriptions
      WHERE status IN ('active', 'trialing') AND (current_period_end IS NULL OR current_period_end > NOW())
    `);
    res.json({
      total_revenue_cents: num((inv as Record<string, unknown>)?.total_revenue_cents),
      paid_revenue_cents: num((inv as Record<string, unknown>)?.paid_cents),
      invoices_paid: (inv as Record<string, unknown>)?.paid_count ?? 0,
      invoices_sent: (inv as Record<string, unknown>)?.sent_count ?? 0,
      invoices_draft: (inv as Record<string, unknown>)?.draft_count ?? 0,
      active_subscriptions: (subs as Record<string, unknown>)?.active_subscriptions ?? 0,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/overview", async (_req, res) => {
  try {
    res.json(await buildDashboardOverview());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/ceo", async (_req, res) => {
  try {
    res.json(await buildCeoCommandCenter());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
