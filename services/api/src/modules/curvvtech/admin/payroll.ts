import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { getPayrollInsight } from '../services/payrollIntelligence.js'

const router = Router()
router.use(requireCurvvtechAdmin)

const PROFILE_SELECT = `
  SELECT
    cp.*,
    u.email AS user_email,
    COALESCE(up.display_name, u.email, cp.name) AS display_name
  FROM compensation_profiles cp
  LEFT JOIN users u ON u.id = cp.user_id
  LEFT JOIN user_profiles up ON up.user_id = cp.user_id
`

router.get('/dashboard', async (_req, res) => {
  try {
    const summary = firstRow<{
      monthly_payroll_cents: string
      employee_count: number
      contractor_count: number
      next_payroll_date: string | null
    }>(await sql`
      SELECT
        COALESCE(SUM(monthly_salary_cents) FILTER (WHERE is_active), 0)::bigint AS monthly_payroll_cents,
        COUNT(*) FILTER (WHERE is_active AND employment_type = 'employee')::int AS employee_count,
        COUNT(*) FILTER (WHERE is_active AND employment_type = 'contractor')::int AS contractor_count,
        (
          SELECT MIN(d)::date::text FROM (
            SELECT period_end AS d FROM payroll_runs
            WHERE status IN ('draft', 'scheduled') AND period_end >= CURRENT_DATE
            UNION ALL
            SELECT COALESCE(next_pay_date, (date_trunc('month', CURRENT_DATE) + (pay_day - 1) * interval '1 day')::date)
            FROM compensation_profiles
            WHERE is_active AND (next_pay_date >= CURRENT_DATE OR pay_day IS NOT NULL)
          ) upcoming
        ) AS next_payroll_date
      FROM compensation_profiles
    `)

    const employeesResult = await pool.query(
      `${PROFILE_SELECT}
      WHERE cp.is_active AND cp.employment_type = 'employee'
      ORDER BY cp.monthly_salary_cents DESC`,
    )

    const contractorsResult = await pool.query(
      `${PROFILE_SELECT}
      WHERE cp.is_active AND cp.employment_type = 'contractor'
      ORDER BY cp.monthly_salary_cents DESC`,
    )

    const departmentRows = (await sql`
      SELECT
        COALESCE(NULLIF(TRIM(department), ''), 'General') AS department,
        COALESCE(SUM(monthly_salary_cents), 0)::bigint AS amount_cents,
        COUNT(*)::int AS headcount
      FROM compensation_profiles
      WHERE is_active
      GROUP BY 1
      ORDER BY amount_cents DESC
    `) as { department: string; amount_cents: string | number; headcount: number }[]

    const totalDept = departmentRows.reduce((s, r) => s + Number(r.amount_cents), 0) || 1

    const trendRows = (await sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - interval '5 months',
          date_trunc('month', NOW()),
          interval '1 month'
        )::date AS month_start
      )
      SELECT
        to_char(m.month_start, 'Mon') AS month_label,
        m.month_start::text,
        COALESCE((
          SELECT SUM(pr.total_cents)::bigint
          FROM payroll_runs pr
          WHERE pr.period_end >= m.month_start
            AND pr.period_end < m.month_start + interval '1 month'
        ), COALESCE((
          SELECT SUM(cp.monthly_salary_cents)::bigint
          FROM compensation_profiles cp
          WHERE cp.is_active
        ), 0)) AS payroll_cents
      FROM months m
      ORDER BY m.month_start ASC
    `) as { month_label: string; month_start: string; payroll_cents: string | number }[]

    const upcomingResult = await pool.query(
      `SELECT * FROM (
        SELECT
          pr.id::text,
          'payroll_run' AS kind,
          COALESCE(pr.period_label, 'Payroll run') AS title,
          pr.period_end::text AS due_date,
          pr.total_cents,
          pr.status
        FROM payroll_runs pr
        WHERE pr.status IN ('draft', 'scheduled')
          AND pr.period_end >= CURRENT_DATE - interval '7 days'
        UNION ALL
        SELECT
          cp.id::text,
          'contractor' AS kind,
          cp.name AS title,
          COALESCE(cp.next_pay_date, (date_trunc('month', CURRENT_DATE) + (cp.pay_day - 1) * interval '1 day')::date)::text AS due_date,
          cp.monthly_salary_cents AS total_cents,
          'scheduled' AS status
        FROM compensation_profiles cp
        WHERE cp.is_active AND cp.employment_type = 'contractor'
          AND (cp.next_pay_date IS NOT NULL OR cp.pay_day IS NOT NULL)
      ) u
      ORDER BY due_date ASC NULLS LAST
      LIMIT 12`,
    )

    const runsResult = await pool.query(
      `SELECT * FROM payroll_runs ORDER BY period_start DESC LIMIT 10`,
    )

    const ai = await getPayrollInsight()

    res.json({
      summary: {
        monthly_payroll_cents: Number(summary?.monthly_payroll_cents ?? 0),
        employee_count: Number(summary?.employee_count ?? 0),
        contractor_count: Number(summary?.contractor_count ?? 0),
        next_payroll_date: summary?.next_payroll_date ?? null,
      },
      employees: employeesResult.rows,
      contractors: contractorsResult.rows,
      departments: departmentRows.map((r) => ({
        department: r.department,
        amount_cents: Number(r.amount_cents),
        headcount: r.headcount,
        pct: Math.round((Number(r.amount_cents) / totalDept) * 100),
      })),
      payroll_trend: trendRows.map((r) => ({
        month_label: r.month_label,
        month_start: r.month_start,
        payroll_cents: Number(r.payroll_cents ?? 0),
      })),
      upcoming: upcomingResult.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        due_date: r.due_date,
        amount_cents: Number(r.total_cents ?? 0),
        status: r.status,
      })),
      payroll_history: runsResult.rows,
      ai_insight: ai,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/profiles', async (_req, res) => {
  try {
    const result = await pool.query(`${PROFILE_SELECT} ORDER BY cp.employment_type, cp.name`)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/profiles', async (req, res) => {
  try {
    const {
      user_id,
      name,
      employment_type,
      role_title,
      department,
      monthly_salary_cents,
      pay_day,
      next_pay_date,
      joined_at,
      is_active,
      notes,
    } = req.body
    const row = firstRow(await sql`
      INSERT INTO compensation_profiles (
        user_id, name, employment_type, role_title, department,
        monthly_salary_cents, pay_day, next_pay_date, joined_at, is_active, notes
      )
      VALUES (
        ${user_id ?? null},
        ${name ?? ''},
        ${employment_type ?? 'employee'},
        ${role_title ?? null},
        ${department ?? null},
        ${monthly_salary_cents ?? 0},
        ${pay_day ?? null},
        ${next_pay_date ?? null},
        ${joined_at ?? null},
        ${is_active !== false},
        ${notes ?? null}
      )
      RETURNING *
    `)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/profiles/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params
    const b = req.body
    const existing = firstRow(await sql`SELECT id FROM compensation_profiles WHERE id = ${profileId}::uuid`)
    if (!existing) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const fields: [string, unknown][] = [
      ['user_id', b.user_id],
      ['name', b.name],
      ['employment_type', b.employment_type],
      ['role_title', b.role_title],
      ['department', b.department],
      ['monthly_salary_cents', b.monthly_salary_cents],
      ['pay_day', b.pay_day],
      ['next_pay_date', b.next_pay_date],
      ['joined_at', b.joined_at],
      ['is_active', b.is_active],
      ['notes', b.notes],
    ]
    for (const [col, val] of fields) {
      if (val !== undefined) {
        await pool.query(`UPDATE compensation_profiles SET "${col}" = $1, "updatedAt" = NOW() WHERE id = $2::uuid`, [
          val,
          profileId,
        ])
      }
    }
    const result = await pool.query(`${PROFILE_SELECT} WHERE cp.id = $1::uuid`, [profileId])
    res.json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/profiles/:profileId', async (req, res) => {
  try {
    await sql`DELETE FROM compensation_profiles WHERE id = ${req.params.profileId}::uuid`
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (_req, res) => {
  try {
    const runs = await sql`SELECT * FROM payroll_runs ORDER BY period_start DESC`
    res.json(runs)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { period_start, period_end, notes, period_label, profile_ids, generate_payslips } = req.body

    const row = firstRow(await sql`
      INSERT INTO payroll_runs (period_start, period_end, notes, period_label, generate_payslips, status)
      VALUES (
        ${period_start},
        ${period_end},
        ${notes ?? null},
        ${period_label ?? null},
        ${generate_payslips !== false},
        'draft'
      )
      RETURNING *
    `)
    if (!row) {
      res.status(500).json({ error: 'Failed to create run' })
      return
    }

    const runId = String((row as { id: string }).id)
    let profiles: { id: string; user_id: string | null; name: string; monthly_salary_cents: number }[] = []

    if (Array.isArray(profile_ids) && profile_ids.length > 0) {
      const result = await pool.query(
        `SELECT id::text, user_id::text, name, monthly_salary_cents
         FROM compensation_profiles
         WHERE id = ANY($1::uuid[]) AND is_active`,
        [profile_ids],
      )
      profiles = result.rows
    } else {
      const result = await pool.query(
        `SELECT id::text, user_id::text, name, monthly_salary_cents
         FROM compensation_profiles WHERE is_active AND employment_type = 'employee'`,
      )
      profiles = result.rows
    }

    for (const p of profiles) {
      const gross = Number(p.monthly_salary_cents ?? 0)
      await sql`
        INSERT INTO payroll_entries (
          payroll_run_id, user_id, employee_name, gross_cents, deductions_cents, net_cents,
          compensation_profile_id
        )
        VALUES (
          ${runId}::uuid,
          ${p.user_id ?? p.id},
          ${p.name},
          ${gross},
          0,
          ${gross},
          ${p.id}::uuid
        )
      `
    }

    if (profiles.length > 0) {
      await sql`
        UPDATE payroll_runs SET total_cents = (
          SELECT COALESCE(SUM(net_cents), 0) FROM payroll_entries WHERE payroll_run_id = ${runId}::uuid
        ), "updatedAt" = NOW()
        WHERE id = ${runId}::uuid
      `
    }

    const final = firstRow<Record<string, unknown>>(await sql`SELECT * FROM payroll_runs WHERE id = ${runId}::uuid`)
    const entries = await sql`SELECT * FROM payroll_entries WHERE payroll_run_id = ${runId}::uuid`
    res.status(201).json({ ...(final ?? {}), entries })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const run = firstRow(await sql`SELECT * FROM payroll_runs WHERE id = ${req.params.id}::uuid`)
    if (!run) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const entries = await sql`SELECT * FROM payroll_entries WHERE payroll_run_id = ${req.params.id}::uuid ORDER BY employee_name`
    res.json({ ...run, entries })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes, generate_payslips } = req.body
    if (status !== undefined) await sql`UPDATE payroll_runs SET status = ${status}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (notes !== undefined) await sql`UPDATE payroll_runs SET notes = ${notes}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (generate_payslips !== undefined) await sql`UPDATE payroll_runs SET generate_payslips = ${generate_payslips}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    res.json(firstRow(await sql`SELECT * FROM payroll_runs WHERE id = ${id}::uuid`))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/entries', async (req, res) => {
  try {
    const { user_id, employee_name, gross_cents, deductions_cents, notes, compensation_profile_id } = req.body
    const net = (gross_cents ?? 0) - (deductions_cents ?? 0)
    const row = firstRow(await sql`
      INSERT INTO payroll_entries (
        payroll_run_id, user_id, employee_name, gross_cents, deductions_cents, net_cents, notes, compensation_profile_id
      )
      VALUES (
        ${req.params.id}::uuid, ${user_id}, ${employee_name ?? ''}, ${gross_cents ?? 0},
        ${deductions_cents ?? 0}, ${net}, ${notes ?? null}, ${compensation_profile_id ?? null}
      )
      RETURNING *
    `)
    await sql`
      UPDATE payroll_runs SET total_cents = (
        SELECT COALESCE(SUM(net_cents), 0) FROM payroll_entries WHERE payroll_run_id = ${req.params.id}::uuid
      ), "updatedAt" = NOW()
      WHERE id = ${req.params.id}::uuid
    `
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id/entries/:entryId', async (req, res) => {
  try {
    await sql`DELETE FROM payroll_entries WHERE id = ${req.params.entryId}::uuid AND payroll_run_id = ${req.params.id}::uuid`
    await sql`
      UPDATE payroll_runs SET total_cents = (
        SELECT COALESCE(SUM(net_cents), 0) FROM payroll_entries WHERE payroll_run_id = ${req.params.id}::uuid
      ), "updatedAt" = NOW()
      WHERE id = ${req.params.id}::uuid
    `
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
