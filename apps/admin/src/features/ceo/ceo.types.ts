export type CeoCommandCenter = {
  hero: {
    business_score: number;
    business_score_delta_week: number;
    revenue_today_cents: number;
    revenue_month_cents: number;
    active_projects: number;
    collections_due_cents: number;
    pipeline_value_cents: number;
    open_leads: number;
    date_label: string;
  };
  priorities: { rank: number; label: string; href: string }[];
  business_score_breakdown: {
    overall: number;
    delta_week: number;
    finance: number;
    delivery: number;
    sales: number;
    operations: number;
    clients: number;
    team: number;
    revenue: number;
    projects: number;
  };
  founder_brief: {
    narrative: string[];
    recommendation: string;
    yesterday: { label: string; value: string }[];
    today: { label: string; value: string }[];
    watch: { label: string; status: string; href: string }[];
  };
  ranked_actions: {
    priority: "critical" | "medium" | "low";
    label: string;
    detail?: string;
    href: string;
  }[];
  money: {
    cash_cents: number;
    receivables_cents: number;
    payables_cents: number;
    profit_month_cents: number;
    expenses_month_cents: number;
    forecast_cents: number;
    gst_liability_cents: number;
    margin_pct: number;
    pipeline_value_cents: number;
    revenue_month_cents: number;
  };
  business_health: {
    delivery: number;
    finance: number;
    sales: number;
    marketing: number;
    support: number;
  };
  team: {
    utilization_pct: number;
    tasks_due_today: number;
    overdue_tasks: number;
    available_capacity_pct: number;
    members: { user_id: string; name: string; role: string; utilization_pct: number; open_tasks: number }[];
  };
  pipeline_forecast: {
    confidence_pct: number;
    expected_close_cents: number;
    average_deal_cents: number;
    open_leads: number;
    chart: { period: string; expected: number }[];
  };
  project_risks: {
    healthy: number;
    near_deadline: number;
    blocked: number;
    waiting_client: number;
    delayed: number;
    items: {
      id: string;
      project_name: string;
      client_name: string;
      risk_level: string;
      risk_label: string;
      due_date: string | null;
    }[];
  };
  widgets: {
    weekly_wins: { label: string }[];
    burn_rate_cents: number;
    calendar: { id?: string; title: string; project_name: string; starts_at: string }[];
    pending_approvals: { kind: string; label: string; href: string }[];
    growth: { mrr_cents: number; revenue_month_cents: number; active_projects: number };
    client_satisfaction: number;
    notifications: { title: string; message: string; href: string }[];
  };
  charts: {
    revenue_trend: { month: string; revenue: number }[];
    cash_flow: { month: string; money_in: number; money_out: number; net: number }[];
    daily_revenue: { period: string; revenue: number; profit: number }[];
  };
};
