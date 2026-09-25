import type { DashboardOverview } from "../dashboard/dashboard.types";
import type { CeoCommandCenter } from "./ceo.types";

export function formatInr(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCompactInr(cents: number) {
  const v = cents / 100;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${Math.round(v / 1000)}K`;
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
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isLegacyCeoPayload(d: Record<string, unknown>): boolean {
  const money = d.money;
  return (
    !d.hero &&
    money != null &&
    typeof money === "object" &&
    "cash_in_bank_cents" in (money as Record<string, unknown>)
  );
}

function emptyCeo(): CeoCommandCenter {
  return {
    hero: {
      business_score: 0,
      business_score_delta_week: 0,
      revenue_today_cents: 0,
      revenue_month_cents: 0,
      active_projects: 0,
      collections_due_cents: 0,
      pipeline_value_cents: 0,
      open_leads: 0,
      date_label: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    },
    priorities: [],
    business_score_breakdown: {
      overall: 0,
      delta_week: 0,
      finance: 0,
      delivery: 0,
      sales: 0,
      operations: 0,
      clients: 0,
      team: 0,
      revenue: 0,
      projects: 0,
    },
    founder_brief: { narrative: [], recommendation: "", yesterday: [], today: [], watch: [] },
    ranked_actions: [],
    money: {
      cash_cents: 0,
      receivables_cents: 0,
      payables_cents: 0,
      profit_month_cents: 0,
      expenses_month_cents: 0,
      forecast_cents: 0,
      gst_liability_cents: 0,
      margin_pct: 0,
      pipeline_value_cents: 0,
      revenue_month_cents: 0,
    },
    business_health: { delivery: 0, finance: 0, sales: 0, marketing: 0, support: 0 },
    team: { utilization_pct: 0, tasks_due_today: 0, overdue_tasks: 0, available_capacity_pct: 0, members: [] },
    pipeline_forecast: { confidence_pct: 0, expected_close_cents: 0, average_deal_cents: 0, open_leads: 0, chart: [] },
    project_risks: { healthy: 0, near_deadline: 0, blocked: 0, waiting_client: 0, delayed: 0, items: [] },
    widgets: {
      weekly_wins: [],
      burn_rate_cents: 0,
      calendar: [],
      pending_approvals: [],
      growth: { mrr_cents: 0, revenue_month_cents: 0, active_projects: 0 },
      client_satisfaction: 4.5,
      notifications: [],
    },
    charts: { revenue_trend: [], cash_flow: [], daily_revenue: [] },
  };
}

function fromLegacyPayload(d: Record<string, unknown>): CeoCommandCenter {
  const base = emptyCeo();
  const money = (d.money ?? {}) as Record<string, unknown>;
  const bh = (d.business_health ?? {}) as Record<string, unknown>;
  const team = (d.team ?? {}) as Record<string, unknown>;
  const ai = (d.ai_founder ?? {}) as {
    summary?: { label: string; href?: string }[];
    suggested_actions?: { label: string; href: string; kind: string }[];
  };
  const charts = (d.charts ?? {}) as {
    revenue_trend?: { month: string; revenue: number }[];
    cash_flow?: { month: string; money_in: number; money_out: number }[];
    pipeline_forecast?: { period: string; expected: number }[];
  };

  const revenueMonth = Number(money.revenue_this_month_cents ?? 0);
  const pipelineValue = Number(money.pipeline_value_cents ?? 0);
  const outstanding = Number(money.outstanding_cents ?? 0);
  const activeProjects = Number(bh.active_projects ?? 0);

  base.hero.revenue_month_cents = revenueMonth;
  base.hero.collections_due_cents = outstanding;
  base.hero.pipeline_value_cents = pipelineValue;
  base.hero.active_projects = activeProjects;

  base.money = {
    cash_cents: Number(money.cash_in_bank_cents ?? 0),
    receivables_cents: outstanding,
    payables_cents: 0,
    profit_month_cents: 0,
    expenses_month_cents: 0,
    forecast_cents: 0,
    gst_liability_cents: 0,
    margin_pct: 0,
    pipeline_value_cents: pipelineValue,
    revenue_month_cents: revenueMonth,
  };

  base.priorities = (ai.summary ?? []).slice(0, 5).map((s, i) => ({
    rank: i + 1,
    label: s.label,
    href: s.href ?? "/",
  }));

  base.ranked_actions = (ai.suggested_actions ?? []).map((a, i) => ({
    priority: (i === 0 ? "critical" : i === 1 ? "medium" : "low") as "critical" | "medium" | "low",
    label: a.label,
    href: a.href,
  }));

  base.team = {
    utilization_pct: Number(team.utilization_pct ?? 0),
    tasks_due_today: Number(team.tasks_due_today ?? 0),
    overdue_tasks: Number(team.overdue_tasks ?? 0),
    available_capacity_pct: Number(team.available_capacity_pct ?? 0),
    members: [],
  };

  base.charts = {
    revenue_trend: charts.revenue_trend ?? [],
    cash_flow: (charts.cash_flow ?? []).map((c) => ({
      month: c.month,
      money_in: c.money_in,
      money_out: c.money_out,
      net: c.money_in - c.money_out,
    })),
    daily_revenue: [],
  };

  base.pipeline_forecast.chart = (charts.pipeline_forecast ?? []).map((p) => ({
    period: p.period,
    expected: p.expected,
  }));

  if (Array.isArray(d.project_risks)) {
    base.project_risks.items = d.project_risks as CeoCommandCenter["project_risks"]["items"];
  }

  return base;
}

function fromNewPayload(d: Record<string, unknown>): CeoCommandCenter {
  const base = emptyCeo();
  const hero = (d.hero ?? {}) as Record<string, unknown>;
  const money = (d.money ?? {}) as Record<string, unknown>;

  base.hero = {
    business_score: Number(hero.business_score ?? 0),
    business_score_delta_week: Number(hero.business_score_delta_week ?? 0),
    revenue_today_cents: Number(hero.revenue_today_cents ?? 0),
    revenue_month_cents: Number(hero.revenue_month_cents ?? money.revenue_month_cents ?? 0),
    active_projects: Number(hero.active_projects ?? 0),
    collections_due_cents: Number(hero.collections_due_cents ?? money.receivables_cents ?? 0),
    pipeline_value_cents: Number(hero.pipeline_value_cents ?? money.pipeline_value_cents ?? 0),
    open_leads: Number(hero.open_leads ?? 0),
    date_label: String(
      hero.date_label ??
        new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    ),
  };

  base.priorities = Array.isArray(d.priorities) ? (d.priorities as CeoCommandCenter["priorities"]) : [];
  base.business_score_breakdown = (d.business_score_breakdown ??
    base.business_score_breakdown) as CeoCommandCenter["business_score_breakdown"];
  base.founder_brief = (d.founder_brief ?? base.founder_brief) as CeoCommandCenter["founder_brief"];
  base.ranked_actions = Array.isArray(d.ranked_actions)
    ? (d.ranked_actions as CeoCommandCenter["ranked_actions"])
    : [];
  base.money = {
    cash_cents: Number(money.cash_cents ?? 0),
    receivables_cents: Number(money.receivables_cents ?? 0),
    payables_cents: Number(money.payables_cents ?? 0),
    profit_month_cents: Number(money.profit_month_cents ?? 0),
    expenses_month_cents: Number(money.expenses_month_cents ?? 0),
    forecast_cents: Number(money.forecast_cents ?? 0),
    gst_liability_cents: Number(money.gst_liability_cents ?? 0),
    margin_pct: Number(money.margin_pct ?? 0),
    pipeline_value_cents: Number(money.pipeline_value_cents ?? 0),
    revenue_month_cents: Number(money.revenue_month_cents ?? 0),
  };
  base.business_health = (d.business_health ?? base.business_health) as CeoCommandCenter["business_health"];
  base.team = (d.team ?? base.team) as CeoCommandCenter["team"];
  base.pipeline_forecast = (d.pipeline_forecast ?? base.pipeline_forecast) as CeoCommandCenter["pipeline_forecast"];
  base.project_risks = Array.isArray(d.project_risks)
    ? { healthy: 0, near_deadline: 0, blocked: 0, waiting_client: 0, delayed: 0, items: d.project_risks as CeoCommandCenter["project_risks"]["items"] }
    : ((d.project_risks ?? base.project_risks) as CeoCommandCenter["project_risks"]);
  base.widgets = (d.widgets ?? base.widgets) as CeoCommandCenter["widgets"];
  base.charts = (d.charts ?? base.charts) as CeoCommandCenter["charts"];

  return base;
}

function enrichFromOverview(ceo: CeoCommandCenter, o: DashboardOverview): CeoCommandCenter {
  const revenue = o.revenue;
  const pipeline = o.pipeline;
  const snapshot = o.today_snapshot;
  const projects = o.projects_summary;
  const widgets = o.widgets;
  const ai = o.ai_assistant;

  const revenueMonth = revenue.paid_this_month_cents;
  const marginPct =
    revenueMonth > 0 ? Math.round((revenue.profit_this_month_cents / revenueMonth) * 100) : 0;

  const financeScore = clamp(
    marginPct * 0.4 +
      (revenue.outstanding_cents === 0 ? 35 : Math.max(0, 35 - (revenue.outstanding_cents / Math.max(revenueMonth, 1)) * 15)) +
      (snapshot.overdue_invoices === 0 ? 25 : Math.max(0, 25 - snapshot.overdue_invoices * 8)),
  );
  const deliveryScore = clamp(projects.average_health_pct || (projects.active > 0 ? 50 : 0));
  const salesScore = clamp(
    Math.min(40, pipeline.open_leads * 8) + pipeline.expected_close_pct * 0.4 + Math.min(20, snapshot.new_leads_today * 5),
  );
  const operationsScore = clamp(100 - snapshot.overdue_invoices * 5);
  const clientScore =
    o.client_health.length > 0
      ? clamp(o.client_health.reduce((s, c) => s + c.health_pct, 0) / o.client_health.length)
      : 88;
  const teamScore = clamp(100 - Math.abs(o.team_utilization_pct - 70) * 0.8);
  const businessScore = clamp((financeScore + deliveryScore + salesScore + operationsScore + clientScore + teamScore) / 6);

  const priorities =
    ceo.priorities.length > 0
      ? ceo.priorities
      : (ai.today_priorities ?? []).slice(0, 5).map((p, i) => ({ rank: i + 1, label: p.label, href: p.href }));

  const ranked_actions =
    ceo.ranked_actions.length > 0
      ? ceo.ranked_actions
      : (ai.suggested_actions ?? []).map((a, i) => ({
          priority: (i === 0 ? "critical" : i === 1 ? "medium" : "low") as "critical" | "medium" | "low",
          label: a.label,
          href: a.href,
        }));

  const ph = o.project_health;
  const healthy = ph.on_track;
  const projectRisks = ceo.project_risks.items.length > 0
    ? ceo.project_risks
    : {
        healthy,
        near_deadline: 0,
        blocked: 0,
        waiting_client: ph.awaiting_client,
        delayed: ph.delayed,
        items: [],
      };

  return {
    ...ceo,
    hero: {
      ...ceo.hero,
      business_score: ceo.hero.business_score || businessScore,
      revenue_today_cents: ceo.hero.revenue_today_cents || revenue.paid_today_cents,
      revenue_month_cents: ceo.hero.revenue_month_cents || revenueMonth,
      active_projects: ceo.hero.active_projects || projects.active,
      collections_due_cents: ceo.hero.collections_due_cents || revenue.outstanding_cents,
      pipeline_value_cents: ceo.hero.pipeline_value_cents || pipeline.pipeline_value_cents,
      open_leads: ceo.hero.open_leads || pipeline.open_leads,
    },
    priorities,
    ranked_actions,
    business_score_breakdown: {
      overall: ceo.business_score_breakdown.overall || businessScore,
      delta_week: ceo.business_score_breakdown.delta_week || revenue.mom_change_pct,
      finance: ceo.business_score_breakdown.finance || financeScore,
      delivery: ceo.business_score_breakdown.delivery || deliveryScore,
      sales: ceo.business_score_breakdown.sales || salesScore,
      operations: ceo.business_score_breakdown.operations || operationsScore,
      clients: ceo.business_score_breakdown.clients || clientScore,
      team: ceo.business_score_breakdown.team || teamScore,
      revenue: ceo.business_score_breakdown.revenue || clamp(revenue.mom_change_pct > 0 ? 70 + revenue.mom_change_pct : 65),
      projects: ceo.business_score_breakdown.projects || deliveryScore,
    },
    founder_brief: {
      narrative: ceo.founder_brief.narrative.length > 0 ? ceo.founder_brief.narrative : (ai.insights ?? []).map((i) => i.label),
      recommendation: ceo.founder_brief.recommendation || ai.recommendation || "",
      yesterday: ceo.founder_brief.yesterday.length > 0 ? ceo.founder_brief.yesterday : [
        { label: "Revenue today", value: formatCompactInr(revenue.paid_today_cents) },
        { label: "Collections", value: formatCompactInr(revenue.outstanding_cents) },
        { label: "Leads", value: String(snapshot.new_leads_today) },
      ],
      today: ceo.founder_brief.today.length > 0 ? ceo.founder_brief.today : [
        { label: "Projects", value: String(projects.active) },
        { label: "Pipeline", value: formatCompactInr(pipeline.pipeline_value_cents) },
        { label: "Overdue", value: String(snapshot.overdue_invoices) },
      ],
      watch: ceo.founder_brief.watch.length > 0
        ? ceo.founder_brief.watch
        : (ai.project_highlights ?? []).slice(0, 3).map((p) => ({
            label: p.name,
            status: `${p.progress_pct}%`,
            href: p.href,
          })),
    },
    money: {
      cash_cents: ceo.money.cash_cents || widgets.cash_in_bank_cents,
      receivables_cents: ceo.money.receivables_cents || revenue.outstanding_cents,
      payables_cents: ceo.money.payables_cents || revenue.expenses_this_month_cents,
      profit_month_cents: ceo.money.profit_month_cents || revenue.profit_this_month_cents,
      expenses_month_cents: ceo.money.expenses_month_cents || revenue.expenses_this_month_cents,
      forecast_cents: ceo.money.forecast_cents || widgets.revenue_forecast_cents,
      gst_liability_cents: ceo.money.gst_liability_cents,
      margin_pct: ceo.money.margin_pct || marginPct,
      pipeline_value_cents: ceo.money.pipeline_value_cents || pipeline.pipeline_value_cents,
      revenue_month_cents: ceo.money.revenue_month_cents || revenueMonth,
    },
    business_health: {
      delivery: ceo.business_health.delivery || deliveryScore,
      finance: ceo.business_health.finance || financeScore,
      sales: ceo.business_health.sales || salesScore,
      marketing: ceo.business_health.marketing || clamp(salesScore * 0.85),
      support: ceo.business_health.support || clientScore,
    },
    team: {
      ...ceo.team,
      utilization_pct: ceo.team.utilization_pct || o.team_utilization_pct,
      members:
        ceo.team.members.length > 0
          ? ceo.team.members
          : (widgets.team_workload ?? []).map((m) => ({
              user_id: m.user_id,
              name: m.name,
              role: m.role,
              utilization_pct: m.utilization_pct,
              open_tasks: m.open_tasks,
            })),
    },
    pipeline_forecast: {
      confidence_pct: ceo.pipeline_forecast.confidence_pct || pipeline.expected_close_pct,
      expected_close_cents:
        ceo.pipeline_forecast.expected_close_cents ||
        Math.round(pipeline.pipeline_value_cents * (pipeline.expected_close_pct / 100)),
      average_deal_cents:
        ceo.pipeline_forecast.average_deal_cents ||
        (pipeline.open_leads > 0 ? Math.round(pipeline.pipeline_value_cents / pipeline.open_leads) : 0),
      open_leads: ceo.pipeline_forecast.open_leads || pipeline.open_leads,
      chart:
        ceo.pipeline_forecast.chart.length > 0
          ? ceo.pipeline_forecast.chart
          : o.monthly_chart.slice(-3).map((m) => ({ period: m.month, expected: m.collections })),
    },
    project_risks: projectRisks,
    widgets: {
      ...ceo.widgets,
      weekly_wins:
        ceo.widgets.weekly_wins.length > 0
          ? ceo.widgets.weekly_wins
          : [{ label: `Revenue ${formatCompactInr(revenueMonth)} this month` }],
      burn_rate_cents: ceo.widgets.burn_rate_cents || revenue.expenses_this_month_cents,
      calendar: ceo.widgets.calendar.length > 0 ? ceo.widgets.calendar : widgets.calendar_events ?? [],
      growth: {
        mrr_cents: ceo.widgets.growth.mrr_cents || revenueMonth,
        revenue_month_cents: ceo.widgets.growth.revenue_month_cents || revenueMonth,
        active_projects: ceo.widgets.growth.active_projects || projects.active,
      },
    },
    charts: {
      revenue_trend:
        ceo.charts.revenue_trend.length > 0
          ? ceo.charts.revenue_trend
          : o.monthly_chart.map((m) => ({ month: m.month, revenue: m.collections })),
      cash_flow:
        ceo.charts.cash_flow.length > 0
          ? ceo.charts.cash_flow
          : o.monthly_chart.map((m) => ({
              month: m.month,
              money_in: m.collections,
              money_out: m.expenses,
              net: m.profit,
            })),
      daily_revenue:
        ceo.charts.daily_revenue.length > 0
          ? ceo.charts.daily_revenue
          : o.daily_chart.map((d) => ({ period: d.period ?? "", revenue: d.collections, profit: d.profit })),
    },
  };
}

export function normalizeCeoCommandCenter(raw: unknown, overview?: DashboardOverview): CeoCommandCenter {
  if (!raw || typeof raw !== "object") {
    return overview ? enrichFromOverview(emptyCeo(), overview) : emptyCeo();
  }

  const d = raw as Record<string, unknown>;
  if (d.error) {
    return overview ? enrichFromOverview(emptyCeo(), overview) : emptyCeo();
  }

  let ceo = isLegacyCeoPayload(d) ? fromLegacyPayload(d) : fromNewPayload(d);

  if (overview) {
    ceo = enrichFromOverview(ceo, overview);
  }

  return ceo;
}
