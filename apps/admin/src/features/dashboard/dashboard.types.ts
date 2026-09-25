export type ChartPoint = {
  period?: string;
  month?: string;
  revenue: number;
  collections: number;
  expenses: number;
  profit: number;
  payments_received?: number;
  outstanding?: number;
};

export type DashboardOverview = {
  revenue: {
    paid_all_time_cents: number;
    paid_today_cents: number;
    paid_yesterday_cents: number;
    paid_today_change_pct: number;
    paid_this_month_cents: number;
    paid_last_month_cents: number;
    mom_change_pct: number;
    outstanding_cents: number;
    expenses_this_month_cents: number;
    profit_this_month_cents: number;
    sparkline: number[];
  };
  monthly_chart: ChartPoint[];
  daily_chart: ChartPoint[];
  today_snapshot: {
    revenue_today_cents: number;
    revenue_today_change_pct: number;
    collections_due_cents: number;
    collections_due_count: number;
    new_leads_today: number;
    qualified_leads: number;
    follow_ups_due: number;
    meetings_today: number;
    active_projects: number;
    projects_nearing_completion: number;
    tasks_due_today: number;
    overdue_invoices: number;
    pending_invoices_cents: number;
    pending_invoice_count: number;
  };
  team_utilization_pct: number;
  lead_funnel: { stage: string; count: number; conversion_pct: number }[];
  pipeline: {
    open_leads: number;
    pipeline_value_cents: number;
    booked_value_cents?: number;
    weighted_pipeline_cents?: number;
    opportunities_count: number;
    expected_close_pct: number;
  };
  projects_summary: {
    active: number;
    awaiting_client: number;
    testing: number;
    deploying: number;
    average_health_pct: number;
  };
  project_health: {
    on_track: number;
    at_risk: number;
    delayed: number;
    awaiting_client: number;
  };
  client_health: {
    id: string;
    name: string;
    revenue_cents: number;
    outstanding_cents: number;
    project_count: number;
    last_contact_at: string | null;
    health_pct: number;
    project_status: string;
    invoice_overdue: boolean;
  }[];
  activity: {
    id: string;
    title?: string;
    message: string;
    created_at: string;
    event_type: string;
    icon: string;
    actor_name: string | null;
    entity_type: string | null;
    entity_id: string | null;
    entity_name: string | null;
    amount_cents: number | null;
    href: string | null;
  }[];
  ai_assistant: {
    daily_summary?: {
      revenue_today_cents: number;
      collections_due_cents: number;
      collections_due_client: string | null;
      profit_month_cents: number;
      active_projects: number;
      pipeline_value_cents: number;
    };
    project_highlights?: {
      id: string;
      name: string;
      client_name: string;
      progress_pct: number;
      status: string;
      href: string;
    }[];
    recommendation?: string;
    today_priorities: { label: string; href: string; kind: string }[];
    insights: { label: string; trend?: "up" | "down" | "neutral" }[];
    suggested_actions: { label: string; href: string }[];
    stats: {
      overdue_follow_ups: number;
      pending_payments_cents: number;
      pending_invoices: number;
      overdue_invoices: number;
      projects_at_risk: number;
      proposals_awaiting: number;
      revenue_today_cents: number;
      revenue_today_change_pct: number;
    };
  };
  widgets: {
    revenue_forecast_cents: number;
    pending_collections_this_week_cents: number;
    pending_collections_this_week_count: number;
    cash_in_bank_cents: number;
    monthly_profit: { revenue_cents: number; expenses_cents: number; profit_cents: number };
    upcoming_deadlines: {
      project_id: string;
      project_name: string;
      client_name: string;
      due_date: string;
    }[];
    recent_payments: {
      id: string;
      amount_cents: number;
      client_name: string;
      paid_at: string;
    }[];
    team_workload: {
      user_id: string;
      name: string;
      role: string;
      open_tasks: number;
      utilization_pct: number;
    }[];
    cash_flow: { month: string; inflow: number; outflow: number; net: number }[];
    weekly_goal?: { target_cents: number; current_cents: number; progress_pct: number };
    project_completion?: { completed: number; in_progress: number; delayed: number };
    recent_files?: { id: string; name: string; created_at: string }[];
    notifications?: { kind: string; title: string; message: string; created_at: string; href: string }[];
    calendar_events?: { id: string; title: string; project_name: string; starts_at: string }[];
  };
};

export type ChartMetric = "revenue" | "collections" | "profit" | "expenses";
export type ChartRange = "7d" | "30d" | "quarter" | "year" | "lifetime";
