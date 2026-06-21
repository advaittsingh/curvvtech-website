import { Router } from "express";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import { requireCurvvtechAdmin } from "../../../middleware/requireCurvvtechAdmin.js";

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

/** CEO command-center metrics — revenue trends, snapshot, pipeline, clients, activity. */
function rowVal(row: unknown, key: string): unknown {
  return row && typeof row === "object" ? (row as Record<string, unknown>)[key] : undefined;
}

router.get("/overview", async (_req, res) => {
  try {
    const revenueRow = firstRow(await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0)::bigint AS paid_all_time_cents,
        COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('month', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS paid_this_month_cents,
        COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('month', NOW() - interval '1 month') AND paid_at < date_trunc('month', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS paid_last_month_cents,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'draft') THEN amount_cents ELSE 0 END), 0)::bigint AS outstanding_cents,
        COUNT(*) FILTER (WHERE status IN ('sent', 'draft'))::int AS pending_invoice_count
      FROM invoices
    `);

    const paidThisMonth = num(rowVal(revenueRow, "paid_this_month_cents"));
    const paidLastMonth = num(rowVal(revenueRow, "paid_last_month_cents"));
    const momPct =
      paidLastMonth > 0
        ? Math.round(((paidThisMonth - paidLastMonth) / paidLastMonth) * 100)
        : paidThisMonth > 0
          ? 100
          : 0;

    const monthlyRows = (await sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - interval '11 months',
          date_trunc('month', NOW()),
          interval '1 month'
        )::date AS month_start
      )
      SELECT
        to_char(m.month_start, 'Mon') AS month_label,
        m.month_start,
        COALESCE((
          SELECT SUM(i.amount_cents)::bigint
          FROM invoices i
          WHERE i.status = 'paid'
            AND i.paid_at >= m.month_start
            AND i.paid_at < m.month_start + interval '1 month'
        ), 0) AS payments_received_cents,
        COALESCE((
          SELECT SUM(i.amount_cents)::bigint
          FROM invoices i
          WHERE i.status IN ('sent', 'draft')
            AND i."createdAt" >= m.month_start
            AND i."createdAt" < m.month_start + interval '1 month'
        ), 0) AS outstanding_cents,
        COALESCE((
          SELECT SUM(i.amount_cents)::bigint
          FROM invoices i
          WHERE i."createdAt" >= m.month_start
            AND i."createdAt" < m.month_start + interval '1 month'
        ), 0) AS revenue_cents
      FROM months m
      ORDER BY m.month_start ASC
    `) as {
      month_label: string;
      payments_received_cents: string | number;
      outstanding_cents: string | number;
      revenue_cents: string | number;
    }[];

    const snapshotRow = firstRow(await sql`
      SELECT
        (SELECT COUNT(*)::int FROM crm_leads WHERE "createdAt" >= date_trunc('day', NOW())) AS new_leads_today,
        (SELECT COUNT(*)::int FROM crm_leads WHERE status IN ('contacted', 'proposal_sent', 'in_discussion', 'negotiation')) AS follow_ups_due,
        (SELECT COUNT(*)::int FROM projects WHERE status NOT IN ('completed', 'cancelled')) AS active_projects,
        (SELECT COUNT(*)::int FROM milestones WHERE due_at IS NOT NULL AND due_at <= NOW() AND completed_at IS NULL) AS tasks_due_today,
        (SELECT COUNT(*)::int FROM invoices WHERE status = 'sent' AND due_at IS NOT NULL AND due_at < NOW()) AS overdue_invoices
    `);

    const teamRow = firstRow(await sql`
      SELECT
        COUNT(*) FILTER (WHERE curvvtech_role IS NOT NULL)::int AS team_count,
        (SELECT COUNT(*)::int FROM projects WHERE status IN ('active', 'planning', 'review')) AS active_delivery
      FROM users
    `);
    const teamCount = Math.max(num(rowVal(teamRow, "team_count")), 1);
    const activeDelivery = num(rowVal(teamRow, "active_delivery"));
    const teamUtilization = Math.min(100, Math.round((activeDelivery / (teamCount * 2)) * 100));

    const funnelRows = (await sql`
      SELECT status, COUNT(*)::int AS count FROM crm_leads GROUP BY status
    `) as { status: string; count: number }[];

    const funnelMap: Record<string, number> = {
      new: 0,
      qualified: 0,
      discovery_call: 0,
      proposal_sent: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    };
    for (const row of funnelRows) {
      const s = String(row.status ?? "new").toLowerCase();
      if (s === "contacted") funnelMap.qualified += row.count;
      else if (s === "in_discussion") funnelMap.discovery_call += row.count;
      else if (s === "closed") funnelMap.lost += row.count;
      else if (s in funnelMap) funnelMap[s as keyof typeof funnelMap] += row.count;
      else funnelMap.new += row.count;
    }
    const totalLeads = Object.values(funnelMap).reduce((a, b) => a + b, 0) || 1;
    const leadFunnel = (["new", "qualified", "discovery_call", "proposal_sent", "negotiation", "won", "lost"] as const).map(
      (stage) => ({
        stage,
        count: funnelMap[stage],
        conversion_pct: Math.round((funnelMap[stage] / totalLeads) * 100),
      }),
    );

    const pipelineRow = firstRow(await sql`
      SELECT
        COALESCE(SUM(i.amount_cents), 0)::bigint AS open_invoice_pipeline_cents,
        COALESCE(SUM(c.contract_value_cents), 0)::bigint AS active_contract_cents,
        COUNT(DISTINCT l.id)::int AS open_leads
      FROM crm_leads l
      LEFT JOIN clients c ON lower(trim(c.company)) = lower(trim(l.company)) OR lower(trim(c.email)) = lower(trim(l.email))
      LEFT JOIN invoices i ON i.client_id = c.id AND i.status IN ('sent', 'draft')
      WHERE l.status NOT IN ('won', 'lost', 'closed')
    `);

    const pipelineCents =
      num(rowVal(pipelineRow, "open_invoice_pipeline_cents")) + num(rowVal(pipelineRow, "active_contract_cents"));

    const clientHealth = (await sql`
      SELECT
        c.id::text,
        c.name,
        c.company,
        COALESCE(SUM(CASE WHEN i.status IN ('sent', 'draft') THEN i.amount_cents ELSE 0 END), 0)::bigint AS outstanding_cents,
        COALESCE(
          (array_agg(p.status ORDER BY p."updatedAt" DESC) FILTER (WHERE p.id IS NOT NULL))[1],
          'none'
        ) AS project_status,
        BOOL_OR(i.status = 'sent' AND i.due_at IS NOT NULL AND i.due_at < NOW()) AS invoice_overdue
      FROM clients c
      LEFT JOIN invoices i ON i.client_id = c.id
      LEFT JOIN projects p ON p.client_id = c.id AND p.status NOT IN ('completed', 'cancelled')
      GROUP BY c.id, c.name, c.company
      HAVING COALESCE(SUM(CASE WHEN i.status IN ('sent', 'draft') THEN i.amount_cents ELSE 0 END), 0) > 0
         OR BOOL_OR(p.id IS NOT NULL)
      ORDER BY outstanding_cents DESC, c.name ASC
      LIMIT 5
    `) as {
      id: string;
      name: string;
      company: string | null;
      outstanding_cents: string | number;
      project_status: string;
      invoice_overdue: boolean;
    }[];

    const activityLogs = (await sql`
      SELECT id::text, action, entity_type, entity_id, details, "createdAt"
      FROM activity_logs
      ORDER BY "createdAt" DESC
      LIMIT 8
    `) as Record<string, unknown>[];

    type ActivityItem = { id: string; message: string; created_at: unknown; source: string };

    let activity: ActivityItem[] = activityLogs.map((a) => ({
      id: String(a.id),
      message: formatActivityMessage(a),
      created_at: a.createdAt,
      source: "log" as const,
    }));

    if (activity.length === 0) {
      const synthesized = (await sql`
        (
          SELECT id::text, 'New lead' AS action, COALESCE(name, company, email, 'Unknown') AS label, "createdAt"
          FROM crm_leads
          ORDER BY "createdAt" DESC
          LIMIT 4
        )
        UNION ALL
        (
          SELECT id::text, 'Invoice paid' AS action, invoice_number AS label, paid_at AS "createdAt"
          FROM invoices
          WHERE status = 'paid' AND paid_at IS NOT NULL
          ORDER BY paid_at DESC
          LIMIT 3
        )
        UNION ALL
        (
          SELECT id::text, 'Demo booked' AS action, COALESCE(name, email, 'Guest') AS label, created_at AS "createdAt"
          FROM demo_requests
          ORDER BY created_at DESC
          LIMIT 3
        )
        ORDER BY "createdAt" DESC
        LIMIT 8
      `) as { id: string; action: string; label: string; createdAt: string }[];

      activity = synthesized.map((row) => ({
        id: row.id,
        message: `${row.action}: ${row.label}`,
        created_at: row.createdAt,
        source: "synthesized" as const,
      }));
    }

    const projectHealth = firstRow(await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed,
        COUNT(*) FILTER (WHERE status = 'awaiting_client')::int AS awaiting_client,
        COUNT(*) FILTER (WHERE progress_pct < 30 AND status = 'active')::int AS at_risk,
        COUNT(*) FILTER (WHERE status IN ('active', 'planning', 'review') AND status NOT IN ('delayed') AND progress_pct >= 30)::int AS on_track
      FROM projects
    `);

    const openLeads = num(rowVal(pipelineRow, "open_leads"));
    const outstandingCents = num(rowVal(revenueRow, "outstanding_cents"));
    const followUpsDue = num(rowVal(snapshotRow, "follow_ups_due"));
    const pendingInvoiceCount = num(rowVal(revenueRow, "pending_invoice_count"));
    const proposalsAwaiting = num(
      rowVal(
        firstRow(await sql`SELECT COUNT(*)::int AS c FROM crm_leads WHERE status = 'proposal_sent'`),
        "c",
      ),
    );

    res.json({
      revenue: {
        paid_all_time_cents: num(rowVal(revenueRow, "paid_all_time_cents")),
        paid_this_month_cents: paidThisMonth,
        paid_last_month_cents: paidLastMonth,
        mom_change_pct: momPct,
        outstanding_cents: outstandingCents,
        sparkline: monthlyRows.map((m) => num(m.payments_received_cents)),
      },
      monthly_chart: monthlyRows.map((m) => ({
        month: m.month_label,
        revenue: num(m.revenue_cents) / 100,
        payments_received: num(m.payments_received_cents) / 100,
        outstanding: num(m.outstanding_cents) / 100,
      })),
      today_snapshot: {
        new_leads_today: num(rowVal(snapshotRow, "new_leads_today")),
        follow_ups_due: followUpsDue,
        pending_invoices_cents: outstandingCents,
        pending_invoice_count: pendingInvoiceCount,
        active_projects: num(rowVal(snapshotRow, "active_projects")),
        tasks_due_today: num(rowVal(snapshotRow, "tasks_due_today")),
        overdue_invoices: num(rowVal(snapshotRow, "overdue_invoices")),
      },
      team_utilization_pct: teamUtilization,
      lead_funnel: leadFunnel,
      pipeline: {
        open_leads: openLeads,
        pipeline_value_cents: pipelineCents,
      },
      project_health: {
        on_track: num(rowVal(projectHealth, "on_track")),
        at_risk: num(rowVal(projectHealth, "at_risk")),
        delayed: num(rowVal(projectHealth, "delayed")),
        awaiting_client: num(rowVal(projectHealth, "awaiting_client")),
      },
      client_health: clientHealth.map((c) => ({
        id: c.id,
        name: c.company || c.name,
        outstanding_cents: num(c.outstanding_cents),
        project_status: c.project_status,
        invoice_overdue: Boolean(c.invoice_overdue),
      })),
      activity,
      ai_assistant: {
        overdue_follow_ups: followUpsDue,
        pending_payments_cents: outstandingCents,
        pending_invoices: pendingInvoiceCount,
        overdue_invoices: num(rowVal(snapshotRow, "overdue_invoices")),
        projects_at_risk: num(rowVal(projectHealth, "at_risk")) + num(rowVal(projectHealth, "delayed")),
        proposals_awaiting: proposalsAwaiting,
        suggested_actions: buildSuggestedActions({
          followUpsDue,
          outstandingCents,
          pendingInvoices: pendingInvoiceCount,
          proposalsAwaiting,
        }),
      },
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

function formatActivityMessage(row: Record<string, unknown>): string {
  const action = String(row.action ?? "Activity");
  const entity = row.entity_type ? String(row.entity_type) : "";
  const details = row.details as Record<string, unknown> | null;
  const label = details?.label ?? details?.name ?? details?.title ?? entity;
  return label ? `${action} · ${label}` : action;
}

function buildSuggestedActions(input: {
  followUpsDue: number;
  outstandingCents: number;
  pendingInvoices: number;
  proposalsAwaiting: number;
}): { label: string; href: string }[] {
  const actions: { label: string; href: string }[] = [];
  if (input.followUpsDue > 0) {
    actions.push({ label: "Review follow-ups", href: "/leads?status=contacted" });
  }
  if (input.pendingInvoices > 0) {
    actions.push({ label: "Send payment reminders", href: "/invoices?status=sent" });
  }
  if (input.proposalsAwaiting > 0) {
    actions.push({ label: "Follow up proposals", href: "/proposals?status=sent" });
  }
  if (input.outstandingCents > 0) {
    actions.push({ label: "View outstanding invoices", href: "/payments" });
  }
  if (actions.length === 0) {
    actions.push({ label: "Create a new lead", href: "/leads" });
    actions.push({ label: "Create proposal", href: "/proposals" });
  }
  return actions.slice(0, 4);
}

type CeoAction = { label: string; href: string; kind: string };

async function buildCeoFounderAssistant(input: {
  outstandingCents: number;
  overdueInvoices: number;
  overdueTasks: number;
  proposalsAwaiting: number;
  projectsAtRisk: number;
}): Promise<{
  summary: { label: string; href?: string }[];
  suggested_actions: CeoAction[];
}> {
  const summary: { label: string; href?: string }[] = [];
  if (input.outstandingCents > 0) {
    summary.push({
      label: `₹${Math.round(input.outstandingCents / 100).toLocaleString("en-IN")} outstanding invoices`,
      href: "/invoices?status=sent",
    });
  }
  if (input.overdueTasks > 0) {
    summary.push({ label: `${input.overdueTasks} overdue task${input.overdueTasks === 1 ? "" : "s"}`, href: "/tasks" });
  }
  if (input.proposalsAwaiting > 0) {
    summary.push({
      label: `${input.proposalsAwaiting} proposal${input.proposalsAwaiting === 1 ? "" : "s"} awaiting response`,
      href: "/proposals?status=sent",
    });
  }
  if (input.projectsAtRisk > 0) {
    summary.push({
      label: `${input.projectsAtRisk} project${input.projectsAtRisk === 1 ? "" : "s"} at risk`,
      href: "/projects",
    });
  }
  if (summary.length === 0) {
    summary.push({ label: "Operations look healthy — no urgent items" });
  }

  const actions: CeoAction[] = [];

  const overdueInv = firstRow(await sql`
    SELECT i.id::text, COALESCE(c.company, c.name, 'Client') AS client_name
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.status = 'sent' AND i.due_at IS NOT NULL AND i.due_at < NOW()
    ORDER BY i.due_at ASC
    LIMIT 1
  `) as { id: string; client_name: string } | null;

  if (overdueInv) {
    actions.push({
      label: `Send reminder to ${overdueInv.client_name}`,
      href: `/invoices/${overdueInv.id}`,
      kind: "invoice_reminder",
    });
  }

  const awaitingProposal = firstRow(await sql`
    SELECT id::text, COALESCE(client_name, title, 'Client') AS label
    FROM proposals
    WHERE status IN ('sent', 'viewed')
    ORDER BY sent_at DESC NULLS LAST, "updatedAt" DESC
    LIMIT 1
  `) as { id: string; label: string } | null;

  if (awaitingProposal) {
    actions.push({
      label: `Follow up proposal with ${awaitingProposal.label}`,
      href: `/proposals/${awaitingProposal.id}`,
      kind: "proposal_followup",
    });
  }

  const riskProject = firstRow(await sql`
    SELECT p.id::text, p.name AS project_name
    FROM projects p
    WHERE p.status NOT IN ('completed', 'cancelled')
      AND (
        p.status = 'delayed'
        OR (p.progress_pct < 30 AND p.status = 'active')
        OR (p.target_end_date IS NOT NULL AND p.target_end_date < CURRENT_DATE)
      )
    ORDER BY
      CASE
        WHEN p.status = 'delayed' THEN 0
        WHEN p.target_end_date IS NOT NULL AND p.target_end_date < CURRENT_DATE THEN 1
        ELSE 2
      END,
      p.target_end_date ASC NULLS LAST
    LIMIT 1
  `) as { id: string; project_name: string } | null;

  if (riskProject) {
    actions.push({
      label: `Review delayed project — ${riskProject.project_name}`,
      href: `/projects/${riskProject.id}`,
      kind: "project_review",
    });
  }

  const pendingApproval = firstRow(await sql`
    SELECT id::text, invoice_number
    FROM invoices
    WHERE status = 'draft'
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `) as { id: string; invoice_number: string } | null;

  if (pendingApproval) {
    actions.push({
      label: `Approve pending invoice ${pendingApproval.invoice_number || ""}`.trim(),
      href: `/invoices/${pendingApproval.id}`,
      kind: "approve_invoice",
    });
  }

  if (input.overdueTasks > 0 && actions.length < 4) {
    actions.push({ label: "Review overdue tasks", href: "/tasks", kind: "overdue_tasks" });
  }

  if (actions.length === 0) {
    actions.push({ label: "Review pipeline", href: "/leads", kind: "pipeline" });
    actions.push({ label: "Create proposal", href: "/proposals", kind: "create_proposal" });
  }

  return { summary, suggested_actions: actions.slice(0, 4) };
}

router.get("/ceo", async (_req, res) => {
  try {
    const revenueRow = firstRow(await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('month', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS paid_this_month_cents,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'draft') THEN amount_cents ELSE 0 END), 0)::bigint AS outstanding_cents
      FROM invoices
    `);

    const company = firstRow(await sql`SELECT cash_in_bank_cents FROM company_settings LIMIT 1`);

    const pipelineRow = firstRow(await sql`
      SELECT
        COALESCE(SUM(deal_value_cents), 0)::bigint AS pipeline_value_cents,
        COUNT(*)::int AS open_leads
      FROM crm_leads
      WHERE status NOT IN ('won', 'closed', 'lost')
    `);

    const snapshotRow = firstRow(await sql`
      SELECT
        (SELECT COUNT(*)::int FROM projects WHERE status NOT IN ('completed', 'cancelled')) AS active_projects,
        (SELECT COUNT(*)::int FROM crm_leads WHERE "createdAt" >= date_trunc('month', NOW())) AS leads_this_month,
        (SELECT COUNT(*)::int FROM invoices WHERE status = 'sent' AND due_at IS NOT NULL AND due_at < NOW()) AS overdue_invoices
    `);

    const taskRow = firstRow(await sql`
      SELECT
        (
          SELECT COUNT(*)::int FROM tasks
          WHERE due_at::date = CURRENT_DATE AND status NOT IN ('done', 'cancelled')
        ) + (
          SELECT COUNT(*)::int FROM milestones
          WHERE due_at::date = CURRENT_DATE AND completed_at IS NULL
        ) AS tasks_due_today,
        (
          SELECT COUNT(*)::int FROM tasks
          WHERE due_at < NOW() AND status NOT IN ('done', 'cancelled')
        ) + (
          SELECT COUNT(*)::int FROM milestones
          WHERE due_at < NOW() AND completed_at IS NULL
        ) AS overdue_tasks
    `);

    const projectHealth = firstRow(await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed,
        COUNT(*) FILTER (WHERE progress_pct < 30 AND status = 'active')::int AS at_risk,
        COUNT(*) FILTER (
          WHERE target_end_date IS NOT NULL AND target_end_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')
        )::int AS overdue_delivery
      FROM projects
    `);

    const projectsAtRisk =
      num(rowVal(projectHealth, "delayed")) +
      num(rowVal(projectHealth, "at_risk")) +
      num(rowVal(projectHealth, "overdue_delivery"));

    const proposalConvRow = firstRow(await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status IN ('approved', 'rejected', 'sent', 'viewed'))::int AS total_decided
      FROM proposals
    `);
    const approved = num(rowVal(proposalConvRow, "approved"));
    const totalDecided = num(rowVal(proposalConvRow, "total_decided"));
    const proposalConversionPct = totalDecided > 0 ? Math.round((approved / totalDecided) * 100) : 0;

    const teamRow = firstRow(await sql`
      SELECT
        COUNT(*) FILTER (WHERE curvvtech_role IS NOT NULL)::int AS team_count,
        (SELECT COUNT(*)::int FROM projects WHERE status IN ('active', 'planning', 'review')) AS active_delivery
      FROM users
    `);
    const teamCount = Math.max(num(rowVal(teamRow, "team_count")), 1);
    const activeDelivery = num(rowVal(teamRow, "active_delivery"));
    const teamUtilization = Math.min(100, Math.round((activeDelivery / (teamCount * 2)) * 100));
    const availableCapacity = Math.max(0, 100 - teamUtilization);

    const proposalsAwaiting = num(
      rowVal(
        firstRow(await sql`SELECT COUNT(*)::int AS c FROM proposals WHERE status IN ('sent', 'viewed')`),
        "c",
      ),
    );

    const outstandingCents = num(rowVal(revenueRow, "outstanding_cents"));
    const overdueTasks = num(rowVal(taskRow, "overdue_tasks"));
    const overdueInvoices = num(rowVal(snapshotRow, "overdue_invoices"));

    const monthlyRows = (await sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - interval '11 months',
          date_trunc('month', NOW()),
          interval '1 month'
        )::date AS month_start
      )
      SELECT
        to_char(m.month_start, 'Mon') AS month_label,
        m.month_start,
        COALESCE((
          SELECT SUM(i.amount_cents)::bigint
          FROM invoices i
          WHERE i.status = 'paid'
            AND i.paid_at >= m.month_start
            AND i.paid_at < m.month_start + interval '1 month'
        ), 0) AS money_in_cents,
        COALESCE((
          SELECT SUM(e.amount_cents)::bigint
          FROM expenses e
          WHERE e.expense_date >= m.month_start
            AND e.expense_date < (m.month_start + interval '1 month')::date
        ), 0) AS money_out_cents,
        COALESCE((
          SELECT SUM(i.amount_cents)::bigint
          FROM invoices i
          WHERE i.status = 'paid'
            AND i.paid_at >= m.month_start
            AND i.paid_at < m.month_start + interval '1 month'
        ), 0) AS revenue_cents
      FROM months m
      ORDER BY m.month_start ASC
    `) as {
      month_label: string;
      money_in_cents: string | number;
      money_out_cents: string | number;
      revenue_cents: string | number;
    }[];

    const pipelineValueCents = num(rowVal(pipelineRow, "pipeline_value_cents"));

    const forecastRows = (await sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()),
          date_trunc('month', NOW()) + interval '2 months',
          interval '1 month'
        )::date AS month_start
      )
      SELECT
        to_char(m.month_start, 'Mon YYYY') AS period_label,
        m.month_start,
        COALESCE((
          SELECT SUM(i.amount_cents)::bigint
          FROM invoices i
          WHERE i.status IN ('sent', 'draft')
            AND i.due_at >= m.month_start
            AND i.due_at < m.month_start + interval '1 month'
        ), 0) AS invoiced_due_cents,
        COALESCE((
          SELECT SUM(p.total_cents)::bigint
          FROM proposals p
          WHERE p.status IN ('sent', 'viewed')
            AND p.sent_at >= m.month_start - interval '30 days'
        ), 0) AS proposal_cents
      FROM months m
      ORDER BY m.month_start ASC
    `) as {
      period_label: string;
      invoiced_due_cents: string | number;
      proposal_cents: string | number;
    }[];

    const pipelineForecast = forecastRows.map((row, i) => {
      const invoicedDue = num(row.invoiced_due_cents);
      const proposalWeight = num(row.proposal_cents);
      const pipelineShare = Math.round(pipelineValueCents * (i === 0 ? 0.2 : i === 1 ? 0.35 : 0.25));
      return {
        period: row.period_label,
        expected_cents: invoicedDue + proposalWeight + pipelineShare,
      };
    });

    const projectRisks = (await sql`
      SELECT
        p.id::text,
        p.name AS project_name,
        COALESCE(c.company, c.name, '—') AS client_name,
        CASE
          WHEN p.status = 'delayed' THEN 'high'
          WHEN p.target_end_date IS NOT NULL AND p.target_end_date < CURRENT_DATE THEN 'high'
          WHEN p.progress_pct < 30 AND p.status = 'active' THEN 'medium'
          ELSE 'low'
        END AS risk_level,
        CASE
          WHEN p.status = 'delayed' THEN 'Delayed'
          WHEN p.target_end_date IS NOT NULL AND p.target_end_date < CURRENT_DATE THEN 'Overdue'
          WHEN p.progress_pct < 30 AND p.status = 'active' THEN 'Behind'
          WHEN p.status = 'awaiting_client' THEN 'Awaiting client'
          ELSE 'At risk'
        END AS risk_label,
        COALESCE(
          p.target_end_date,
          (SELECT MIN(m.due_at)::date FROM milestones m WHERE m.project_id = p.id AND m.completed_at IS NULL)
        ) AS due_date
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.status NOT IN ('completed', 'cancelled')
        AND (
          p.status IN ('delayed', 'awaiting_client')
          OR (p.progress_pct < 30 AND p.status = 'active')
          OR (p.target_end_date IS NOT NULL AND p.target_end_date <= CURRENT_DATE + interval '14 days')
        )
      ORDER BY
        CASE
          WHEN p.status = 'delayed' THEN 0
          WHEN p.target_end_date IS NOT NULL AND p.target_end_date < CURRENT_DATE THEN 1
          WHEN p.progress_pct < 30 AND p.status = 'active' THEN 2
          ELSE 3
        END,
        due_date ASC NULLS LAST
      LIMIT 12
    `) as {
      id: string;
      project_name: string;
      client_name: string;
      risk_level: string;
      risk_label: string;
      due_date: string | null;
    }[];

    const aiFounder = await buildCeoFounderAssistant({
      outstandingCents,
      overdueInvoices,
      overdueTasks,
      proposalsAwaiting,
      projectsAtRisk,
    });

    res.json({
      money: {
        cash_in_bank_cents: num(rowVal(company, "cash_in_bank_cents")),
        outstanding_cents: outstandingCents,
        pipeline_value_cents: pipelineValueCents,
        revenue_this_month_cents: num(rowVal(revenueRow, "paid_this_month_cents")),
      },
      business_health: {
        active_projects: num(rowVal(snapshotRow, "active_projects")),
        projects_at_risk: projectsAtRisk,
        leads_this_month: num(rowVal(snapshotRow, "leads_this_month")),
        proposal_conversion_pct: proposalConversionPct,
      },
      team: {
        utilization_pct: teamUtilization,
        tasks_due_today: num(rowVal(taskRow, "tasks_due_today")),
        overdue_tasks: overdueTasks,
        available_capacity_pct: availableCapacity,
      },
      ai_founder: aiFounder,
      charts: {
        revenue_trend: monthlyRows.map((m) => ({
          month: m.month_label,
          revenue: num(m.revenue_cents) / 100,
        })),
        cash_flow: monthlyRows.map((m) => ({
          month: m.month_label,
          money_in: num(m.money_in_cents) / 100,
          money_out: num(m.money_out_cents) / 100,
        })),
        pipeline_forecast: pipelineForecast.map((f) => ({
          period: f.period,
          expected: f.expected_cents / 100,
        })),
      },
      project_risks: projectRisks.map((r) => ({
        id: r.id,
        project_name: r.project_name,
        client_name: r.client_name,
        risk_level: r.risk_level,
        risk_label: r.risk_label,
        due_date: r.due_date,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
