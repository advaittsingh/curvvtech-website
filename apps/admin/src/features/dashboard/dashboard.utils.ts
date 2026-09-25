export function formatInr(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCompactInr(cents: number) {
  const rupees = cents / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return formatInr(cents);
}

export function greetingName(email: string | null | undefined): string {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "there";
  return local.charAt(0).toUpperCase() + local.slice(1).replace(/[._]/g, " ");
}

export function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDueLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  discovery_call: "Discovery",
  proposal_sent: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const QUICK_ACTIONS = [
  { label: "Lead", href: "/leads", primary: true },
  { label: "Proposal", href: "/proposals", primary: true },
  { label: "Invoice", href: "/invoices", primary: true },
  { label: "Project", href: "/projects", primary: true },
] as const;

/** Coerce legacy / partial API payloads into the shape the dashboard UI expects. */
export function normalizeDashboardOverview(raw: unknown): import("./dashboard.types").DashboardOverview {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const revenue = (d.revenue && typeof d.revenue === "object" ? d.revenue : {}) as Record<string, unknown>;
  const snapshot = (d.today_snapshot && typeof d.today_snapshot === "object" ? d.today_snapshot : {}) as Record<string, unknown>;
  const pipeline = (d.pipeline && typeof d.pipeline === "object" ? d.pipeline : {}) as Record<string, unknown>;
  const projectHealth = (d.project_health && typeof d.project_health === "object" ? d.project_health : {}) as Record<string, unknown>;
  const projectsSummary = (d.projects_summary && typeof d.projects_summary === "object" ? d.projects_summary : {}) as Record<string, unknown>;
  const widgetsRaw = (d.widgets && typeof d.widgets === "object" ? d.widgets : {}) as Record<string, unknown>;
  const aiRaw = (d.ai_assistant && typeof d.ai_assistant === "object" ? d.ai_assistant : {}) as Record<string, unknown>;
  const monthlyProfitRaw = (widgetsRaw.monthly_profit && typeof widgetsRaw.monthly_profit === "object"
    ? widgetsRaw.monthly_profit
    : {}) as Record<string, unknown>;

  const paidThisMonth = Number(revenue.paid_this_month_cents ?? 0);
  const expensesThisMonth = Number(revenue.expenses_this_month_cents ?? monthlyProfitRaw.expenses_cents ?? 0);
  const activeProjects = Number(snapshot.active_projects ?? 0);

  const monthlyChart = Array.isArray(d.monthly_chart)
    ? d.monthly_chart.map((m) => {
        const row = m as Record<string, unknown>;
        const collections = Number(row.collections ?? row.payments_received ?? 0);
        const expenses = Number(row.expenses ?? 0);
        return {
          month: String(row.month ?? ""),
          revenue: Number(row.revenue ?? 0),
          collections,
          payments_received: collections,
          outstanding: Number(row.outstanding ?? 0),
          expenses,
          profit: Number(row.profit ?? collections - expenses),
        };
      })
    : [];

  const dailyChart = Array.isArray(d.daily_chart)
    ? d.daily_chart.map((row) => {
        const r = row as Record<string, unknown>;
        const collections = Number(r.collections ?? r.revenue ?? 0);
        const expenses = Number(r.expenses ?? 0);
        return {
          period: String(r.period ?? ""),
          revenue: Number(r.revenue ?? collections),
          collections,
          expenses,
          profit: Number(r.profit ?? collections - expenses),
        };
      })
    : monthlyChart.slice(-1).map((m) => ({
        period: m.month,
        revenue: m.revenue,
        collections: m.collections,
        expenses: m.expenses,
        profit: m.profit,
      }));

  const legacyAiActions = Array.isArray(aiRaw.suggested_actions) ? aiRaw.suggested_actions as { label: string; href: string }[] : [];
  const todayPriorities = Array.isArray(aiRaw.today_priorities)
    ? aiRaw.today_priorities as { label: string; href: string; kind: string }[]
    : [];
  const insights = Array.isArray(aiRaw.insights)
    ? aiRaw.insights as { label: string; trend?: "up" | "down" | "neutral" }[]
    : [];

  if (todayPriorities.length === 0 && Number(aiRaw.overdue_follow_ups ?? snapshot.follow_ups_due ?? 0) > 0) {
    todayPriorities.push({
      label: `${Number(aiRaw.overdue_follow_ups ?? snapshot.follow_ups_due)} leads need follow-up`,
      href: "/leads",
      kind: "leads",
    });
  }
  if (todayPriorities.length === 0 && Number(aiRaw.overdue_invoices ?? snapshot.overdue_invoices ?? 0) > 0) {
    todayPriorities.push({
      label: `${Number(aiRaw.overdue_invoices ?? snapshot.overdue_invoices)} invoices overdue`,
      href: "/invoices?status=sent",
      kind: "invoice",
    });
  }
  if (todayPriorities.length === 0 && Number(aiRaw.projects_at_risk ?? 0) > 0) {
    todayPriorities.push({
      label: `${Number(aiRaw.projects_at_risk)} projects at risk`,
      href: "/projects",
      kind: "project",
    });
  }

  if (insights.length === 0 && Number(revenue.mom_change_pct ?? 0) !== 0) {
    const mom = Number(revenue.mom_change_pct);
    insights.push({
      label: `Revenue ${mom >= 0 ? "up" : "down"} ${Math.abs(mom)}% vs last month`,
      trend: mom >= 0 ? "up" : "down",
    });
  }

  const clientHealth = Array.isArray(d.client_health)
    ? d.client_health.map((c) => {
        const row = c as Record<string, unknown>;
        return {
          id: String(row.id ?? ""),
          name: String(row.name ?? "Client"),
          revenue_cents: Number(row.revenue_cents ?? 0),
          outstanding_cents: Number(row.outstanding_cents ?? 0),
          project_count: Number(row.project_count ?? 0),
          last_contact_at: row.last_contact_at ? String(row.last_contact_at) : null,
          health_pct: Number(row.health_pct ?? 0),
          project_status: String(row.project_status ?? "none"),
          invoice_overdue: Boolean(row.invoice_overdue),
        };
      })
    : [];

  const activity = Array.isArray(d.activity)
    ? d.activity.map((a) => {
        const row = a as Record<string, unknown>;
        return {
          id: String(row.id ?? ""),
          message: String(row.message ?? "Activity"),
          created_at: String(row.created_at ?? ""),
          event_type: String(row.event_type ?? "activity"),
          icon: String(row.icon ?? "activity"),
          actor_name: row.actor_name ? String(row.actor_name) : null,
          entity_type: row.entity_type ? String(row.entity_type) : null,
          entity_id: row.entity_id ? String(row.entity_id) : null,
          entity_name: row.entity_name ? String(row.entity_name) : null,
          amount_cents: row.amount_cents != null ? Number(row.amount_cents) : null,
          href: row.href ? String(row.href) : null,
        };
      })
    : [];

  return {
    revenue: {
      paid_all_time_cents: Number(revenue.paid_all_time_cents ?? 0),
      paid_today_cents: Number(revenue.paid_today_cents ?? 0),
      paid_yesterday_cents: Number(revenue.paid_yesterday_cents ?? 0),
      paid_today_change_pct: Number(revenue.paid_today_change_pct ?? 0),
      paid_this_month_cents: paidThisMonth,
      paid_last_month_cents: Number(revenue.paid_last_month_cents ?? 0),
      mom_change_pct: Number(revenue.mom_change_pct ?? 0),
      outstanding_cents: Number(revenue.outstanding_cents ?? 0),
      expenses_this_month_cents: expensesThisMonth,
      profit_this_month_cents: Number(revenue.profit_this_month_cents ?? paidThisMonth - expensesThisMonth),
      sparkline: Array.isArray(revenue.sparkline) ? revenue.sparkline.map(Number) : [],
    },
    monthly_chart: monthlyChart,
    daily_chart: dailyChart,
    today_snapshot: {
      revenue_today_cents: Number(snapshot.revenue_today_cents ?? revenue.paid_today_cents ?? 0),
      revenue_today_change_pct: Number(snapshot.revenue_today_change_pct ?? revenue.paid_today_change_pct ?? 0),
      collections_due_cents: Number(snapshot.collections_due_cents ?? snapshot.pending_invoices_cents ?? revenue.outstanding_cents ?? 0),
      collections_due_count: Number(snapshot.collections_due_count ?? snapshot.pending_invoice_count ?? 0),
      new_leads_today: Number(snapshot.new_leads_today ?? 0),
      qualified_leads: Number(snapshot.qualified_leads ?? 0),
      follow_ups_due: Number(snapshot.follow_ups_due ?? 0),
      meetings_today: Number(snapshot.meetings_today ?? 0),
      active_projects: activeProjects,
      projects_nearing_completion: Number(snapshot.projects_nearing_completion ?? 0),
      tasks_due_today: Number(snapshot.tasks_due_today ?? 0),
      overdue_invoices: Number(snapshot.overdue_invoices ?? 0),
      pending_invoices_cents: Number(snapshot.pending_invoices_cents ?? revenue.outstanding_cents ?? 0),
      pending_invoice_count: Number(snapshot.pending_invoice_count ?? 0),
    },
    team_utilization_pct: Number(d.team_utilization_pct ?? 0),
    lead_funnel: Array.isArray(d.lead_funnel)
      ? d.lead_funnel.map((f) => {
          const row = f as Record<string, unknown>;
          return {
            stage: String(row.stage ?? ""),
            count: Number(row.count ?? 0),
            conversion_pct: Number(row.conversion_pct ?? 0),
          };
        })
      : [],
    pipeline: {
      open_leads: Number(pipeline.open_leads ?? 0),
      pipeline_value_cents: Number(pipeline.pipeline_value_cents ?? 0),
      booked_value_cents: Number(pipeline.booked_value_cents ?? 0),
      weighted_pipeline_cents: Number(pipeline.weighted_pipeline_cents ?? 0),
      opportunities_count: Number(pipeline.opportunities_count ?? pipeline.open_leads ?? 0),
      expected_close_pct: Number(pipeline.expected_close_pct ?? 0),
    },
    projects_summary: {
      active: Number(projectsSummary.active ?? activeProjects),
      awaiting_client: Number(projectsSummary.awaiting_client ?? projectHealth.awaiting_client ?? 0),
      testing: Number(projectsSummary.testing ?? 0),
      deploying: Number(projectsSummary.deploying ?? 0),
      average_health_pct: Number(projectsSummary.average_health_pct ?? 0),
    },
    project_health: {
      on_track: Number(projectHealth.on_track ?? 0),
      at_risk: Number(projectHealth.at_risk ?? 0),
      delayed: Number(projectHealth.delayed ?? 0),
      awaiting_client: Number(projectHealth.awaiting_client ?? 0),
    },
    client_health: clientHealth,
    activity,
    ai_assistant: {
      daily_summary: aiRaw.daily_summary
        ? {
            revenue_today_cents: Number((aiRaw.daily_summary as Record<string, unknown>).revenue_today_cents ?? snapshot.revenue_today_cents ?? 0),
            collections_due_cents: Number((aiRaw.daily_summary as Record<string, unknown>).collections_due_cents ?? revenue.outstanding_cents ?? 0),
            collections_due_client: (aiRaw.daily_summary as Record<string, unknown>).collections_due_client as string | null ?? null,
            profit_month_cents: Number((aiRaw.daily_summary as Record<string, unknown>).profit_month_cents ?? revenue.profit_this_month_cents ?? 0),
            active_projects: Number((aiRaw.daily_summary as Record<string, unknown>).active_projects ?? activeProjects),
            pipeline_value_cents: Number((aiRaw.daily_summary as Record<string, unknown>).pipeline_value_cents ?? pipeline.pipeline_value_cents ?? 0),
          }
        : {
            revenue_today_cents: Number(snapshot.revenue_today_cents ?? revenue.paid_today_cents ?? 0),
            collections_due_cents: Number(revenue.outstanding_cents ?? 0),
            collections_due_client: null,
            profit_month_cents: Number(revenue.profit_this_month_cents ?? paidThisMonth - expensesThisMonth),
            active_projects: activeProjects,
            pipeline_value_cents: Number(pipeline.pipeline_value_cents ?? 0),
          },
      project_highlights: Array.isArray(aiRaw.project_highlights)
        ? (aiRaw.project_highlights as Record<string, unknown>[]).map((p) => ({
            id: String(p.id ?? ""),
            name: String(p.name ?? ""),
            client_name: String(p.client_name ?? ""),
            progress_pct: Number(p.progress_pct ?? 0),
            status: String(p.status ?? ""),
            href: String(p.href ?? "/projects"),
          }))
        : [],
      recommendation: typeof aiRaw.recommendation === "string" ? aiRaw.recommendation : "",
      today_priorities: todayPriorities,
      insights,
      suggested_actions: legacyAiActions,
      stats: {
        overdue_follow_ups: Number(aiRaw.overdue_follow_ups ?? snapshot.follow_ups_due ?? 0),
        pending_payments_cents: Number(aiRaw.pending_payments_cents ?? revenue.outstanding_cents ?? 0),
        pending_invoices: Number(aiRaw.pending_invoices ?? snapshot.pending_invoice_count ?? 0),
        overdue_invoices: Number(aiRaw.overdue_invoices ?? snapshot.overdue_invoices ?? 0),
        projects_at_risk: Number(aiRaw.projects_at_risk ?? 0),
        proposals_awaiting: Number(aiRaw.proposals_awaiting ?? 0),
        revenue_today_cents: Number(aiRaw.revenue_today_cents ?? snapshot.revenue_today_cents ?? 0),
        revenue_today_change_pct: Number(aiRaw.revenue_today_change_pct ?? snapshot.revenue_today_change_pct ?? 0),
      },
    },
    widgets: {
      revenue_forecast_cents: Number(widgetsRaw.revenue_forecast_cents ?? 0),
      pending_collections_this_week_cents: Number(widgetsRaw.pending_collections_this_week_cents ?? 0),
      pending_collections_this_week_count: Number(widgetsRaw.pending_collections_this_week_count ?? 0),
      cash_in_bank_cents: Number(widgetsRaw.cash_in_bank_cents ?? 0),
      monthly_profit: {
        revenue_cents: Number(monthlyProfitRaw.revenue_cents ?? paidThisMonth),
        expenses_cents: Number(monthlyProfitRaw.expenses_cents ?? expensesThisMonth),
        profit_cents: Number(monthlyProfitRaw.profit_cents ?? paidThisMonth - expensesThisMonth),
      },
      upcoming_deadlines: Array.isArray(widgetsRaw.upcoming_deadlines)
        ? widgetsRaw.upcoming_deadlines as import("./dashboard.types").DashboardOverview["widgets"]["upcoming_deadlines"]
        : [],
      recent_payments: Array.isArray(widgetsRaw.recent_payments)
        ? widgetsRaw.recent_payments as import("./dashboard.types").DashboardOverview["widgets"]["recent_payments"]
        : [],
      team_workload: Array.isArray(widgetsRaw.team_workload)
        ? widgetsRaw.team_workload as import("./dashboard.types").DashboardOverview["widgets"]["team_workload"]
        : [],
      cash_flow: Array.isArray(widgetsRaw.cash_flow)
        ? widgetsRaw.cash_flow as import("./dashboard.types").DashboardOverview["widgets"]["cash_flow"]
        : monthlyChart.map((m) => ({
            month: m.month,
            inflow: m.collections * 100,
            outflow: m.expenses * 100,
            net: (m.collections - m.expenses) * 100,
          })),
      weekly_goal: widgetsRaw.weekly_goal
        ? {
            target_cents: Number((widgetsRaw.weekly_goal as Record<string, unknown>).target_cents ?? 20000000),
            current_cents: Number((widgetsRaw.weekly_goal as Record<string, unknown>).current_cents ?? paidThisMonth),
            progress_pct: Number((widgetsRaw.weekly_goal as Record<string, unknown>).progress_pct ?? 0),
          }
        : { target_cents: 20000000, current_cents: paidThisMonth, progress_pct: Math.min(100, Math.round((paidThisMonth / 20000000) * 100)) },
      project_completion: widgetsRaw.project_completion
        ? {
            completed: Number((widgetsRaw.project_completion as Record<string, unknown>).completed ?? 0),
            in_progress: Number((widgetsRaw.project_completion as Record<string, unknown>).in_progress ?? activeProjects),
            delayed: Number((widgetsRaw.project_completion as Record<string, unknown>).delayed ?? projectHealth.delayed ?? 0),
          }
        : { completed: 0, in_progress: activeProjects, delayed: Number(projectHealth.delayed ?? 0) },
      recent_files: Array.isArray(widgetsRaw.recent_files)
        ? (widgetsRaw.recent_files as Record<string, unknown>[]).map((f) => ({
            id: String(f.id ?? ""),
            name: String(f.name ?? "File"),
            created_at: String(f.created_at ?? ""),
          }))
        : [],
      notifications: Array.isArray(widgetsRaw.notifications)
        ? (widgetsRaw.notifications as Record<string, unknown>[]).map((n) => ({
            kind: String(n.kind ?? "info"),
            title: String(n.title ?? ""),
            message: String(n.message ?? ""),
            created_at: String(n.created_at ?? ""),
            href: String(n.href ?? "#"),
          }))
        : [],
      calendar_events: Array.isArray(widgetsRaw.calendar_events)
        ? (widgetsRaw.calendar_events as Record<string, unknown>[]).map((e) => ({
            id: String(e.id ?? ""),
            title: String(e.title ?? ""),
            project_name: String(e.project_name ?? ""),
            starts_at: String(e.starts_at ?? ""),
          }))
        : [],
    },
  };
}
