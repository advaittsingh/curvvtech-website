import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { getExpenseInsight } from '../services/expenseIntelligence.js'

const router = Router()
router.use(requireCurvvtechAdmin)

const EXPENSE_LIST_SQL = `
  SELECT
    e.*,
    p.name AS project_name
  FROM expenses e
  LEFT JOIN projects p ON p.id = e.project_id
`

router.get('/dashboard', async (_req, res) => {
  try {
    const summary = firstRow<{
      monthly_spend_cents: string
      revenue_cents: string
      total_collected_cents: string
      total_expense_cents: string
    }>(await sql`
      SELECT
        COALESCE((
          SELECT SUM(amount_cents) FROM expenses
          WHERE expense_date >= date_trunc('month', CURRENT_DATE)
        ), 0)::bigint AS monthly_spend_cents,
        COALESCE((
          SELECT SUM(COALESCE(total_cents, amount_cents, 0)) FROM invoices
          WHERE status = 'paid'
            AND paid_at >= date_trunc('month', CURRENT_DATE)
        ), 0)::bigint AS revenue_cents,
        COALESCE((
          SELECT SUM(COALESCE(total_cents, amount_cents, 0)) FROM invoices WHERE status = 'paid'
        ), 0)::bigint AS total_collected_cents,
        COALESCE((SELECT SUM(amount_cents) FROM expenses), 0)::bigint AS total_expense_cents
    `)

    const monthlySpend = Number(summary?.monthly_spend_cents ?? 0)
    const revenue = Number(summary?.revenue_cents ?? 0)
    const profit = revenue - monthlySpend
    const profitMargin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

    const burn = firstRow<{ monthly_burn_cents: string }>(await sql`
      SELECT COALESCE(AVG(month_total), 0)::bigint AS monthly_burn_cents
      FROM (
        SELECT date_trunc('month', expense_date) AS m, SUM(amount_cents) AS month_total
        FROM expenses
        WHERE expense_date >= date_trunc('month', CURRENT_DATE) - interval '5 months'
        GROUP BY 1
      ) t
    `)

    const monthlyBurn = Math.round(Number(burn?.monthly_burn_cents ?? monthlySpend))
    const cashPosition = Number(summary?.total_collected_cents ?? 0) - Number(summary?.total_expense_cents ?? 0)
    const runwayMonths = monthlyBurn > 0 && cashPosition > 0 ? Math.round(cashPosition / monthlyBurn) : null

    const categoryRows = (await sql`
      SELECT
        category,
        COALESCE(SUM(amount_cents), 0)::bigint AS amount_cents,
        COUNT(*)::int AS count
      FROM expenses
      WHERE expense_date >= date_trunc('month', CURRENT_DATE) - interval '3 months'
      GROUP BY category
      ORDER BY amount_cents DESC
    `) as { category: string; amount_cents: string | number; count: number }[]

    const totalCategoryCents = categoryRows.reduce((s, r) => s + Number(r.amount_cents), 0) || 1
    const categories = categoryRows.map((r) => ({
      category: r.category,
      amount_cents: Number(r.amount_cents),
      count: r.count,
      pct: Math.round((Number(r.amount_cents) / totalCategoryCents) * 100),
    }))

    const recentResult = await pool.query(
      `${EXPENSE_LIST_SQL}
      ORDER BY e.expense_date DESC, e."createdAt" DESC
      LIMIT 20`,
    )

    const projectResult = await pool.query(
      `SELECT
        p.id::text,
        p.name,
        COALESCE(inv.revenue_cents, 0)::bigint AS revenue_cents,
        COALESCE(exp.expense_cents, 0)::bigint AS expense_cents
      FROM projects p
      LEFT JOIN (
        SELECT project_id, SUM(COALESCE(total_cents, amount_cents, 0)) AS revenue_cents
        FROM invoices
        WHERE status = 'paid' AND project_id IS NOT NULL
        GROUP BY project_id
      ) inv ON inv.project_id = p.id
      LEFT JOIN (
        SELECT project_id, SUM(amount_cents) AS expense_cents
        FROM expenses
        WHERE project_id IS NOT NULL
        GROUP BY project_id
      ) exp ON exp.project_id = p.id
      WHERE COALESCE(inv.revenue_cents, 0) > 0 OR COALESCE(exp.expense_cents, 0) > 0
      ORDER BY (COALESCE(inv.revenue_cents, 0) - COALESCE(exp.expense_cents, 0)) DESC
      LIMIT 8`,
    )

    const ai = await getExpenseInsight()

    res.json({
      summary: {
        monthly_spend_cents: monthlySpend,
        revenue_cents: revenue,
        profit_cents: profit,
        profit_margin: profitMargin,
      },
      burn: {
        monthly_burn_cents: monthlyBurn,
        runway_months: runwayMonths,
        cash_position_cents: cashPosition,
      },
      categories,
      recent_expenses: recentResult.rows,
      project_profitability: projectResult.rows.map((r: Record<string, unknown>) => {
        const rev = Number(r.revenue_cents ?? 0)
        const exp = Number(r.expense_cents ?? 0)
        const projProfit = rev - exp
        return {
          id: r.id,
          name: r.name,
          revenue_cents: rev,
          expense_cents: exp,
          profit_cents: projProfit,
          margin_pct: rev > 0 ? Math.round((projProfit / rev) * 100) : 0,
        }
      }),
      ai_insight: ai,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query
    let rows
    if (category && status) {
      rows = await pool.query(
        `${EXPENSE_LIST_SQL} WHERE e.category = $1 AND e.status = $2 ORDER BY e.expense_date DESC`,
        [String(category), String(status)],
      )
      res.json(rows.rows)
      return
    }
    if (category) {
      rows = await pool.query(`${EXPENSE_LIST_SQL} WHERE e.category = $1 ORDER BY e.expense_date DESC`, [
        String(category),
      ])
      res.json(rows.rows)
      return
    }
    if (status) {
      rows = await pool.query(`${EXPENSE_LIST_SQL} WHERE e.status = $1 ORDER BY e.expense_date DESC`, [
        String(status),
      ])
      res.json(rows.rows)
      return
    }
    rows = await pool.query(`${EXPENSE_LIST_SQL} ORDER BY e.expense_date DESC`)
    res.json(rows.rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const auth = req.auth!
    const { category, description, amount_cents, expense_date, vendor, receipt_s3_key, receipt_url, status, project_id } =
      req.body
    const row = firstRow(await sql`
      INSERT INTO expenses (category, description, amount_cents, expense_date, vendor, receipt_s3_key, receipt_url, status, project_id, created_by_user_id)
      VALUES (
        ${category ?? 'general'},
        ${description ?? ''},
        ${amount_cents ?? 0},
        ${expense_date ?? new Date().toISOString().slice(0, 10)},
        ${vendor ?? null},
        ${receipt_s3_key ?? null},
        ${receipt_url ?? null},
        ${status ?? 'approved'},
        ${project_id ?? null},
        ${auth.sub}
      )
      RETURNING *
    `)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { category, description, amount_cents, expense_date, vendor, receipt_s3_key, receipt_url, status, project_id } =
      req.body
    const existing = firstRow(await sql`SELECT id FROM expenses WHERE id = ${id}::uuid`)
    if (!existing) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    if (category !== undefined) await sql`UPDATE expenses SET category = ${category}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (description !== undefined) await sql`UPDATE expenses SET description = ${description}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (amount_cents !== undefined) await sql`UPDATE expenses SET amount_cents = ${amount_cents}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (expense_date !== undefined) await sql`UPDATE expenses SET expense_date = ${expense_date}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (vendor !== undefined) await sql`UPDATE expenses SET vendor = ${vendor}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (receipt_s3_key !== undefined) await sql`UPDATE expenses SET receipt_s3_key = ${receipt_s3_key}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (receipt_url !== undefined) await sql`UPDATE expenses SET receipt_url = ${receipt_url}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (status !== undefined) await sql`UPDATE expenses SET status = ${status}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (project_id !== undefined) await sql`UPDATE expenses SET project_id = ${project_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    const updated = await pool.query(
      `${EXPENSE_LIST_SQL} WHERE e.id = $1::uuid`,
      [id],
    )
    res.json(updated.rows[0] ?? firstRow(await sql`SELECT * FROM expenses WHERE id = ${id}::uuid`))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await sql`DELETE FROM expenses WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
