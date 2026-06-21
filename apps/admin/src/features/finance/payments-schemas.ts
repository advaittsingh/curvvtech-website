import { formatInr, formatShortDate } from "../clients/constants";

export type PaymentsSummary = {
  collected_cents: number;
  pending_cents: number;
  overdue_cents: number;
  expected_this_month_cents: number;
  collection_rate: number;
};

export type PaymentsCashflow = {
  collected_this_week_cents: number;
  collected_this_month_cents: number;
  avg_invoice_cents: number;
  collection_rate: number;
};

export type CollectionPipeline = {
  overdue_cents: number;
  due_this_week_cents: number;
  due_this_month_cents: number;
  future_cents: number;
};

export type RevenueTrendPoint = {
  month_label: string;
  month_start: string;
  collected_cents: number;
};

export type RecentPayment = {
  id: string;
  invoice_number?: string | null;
  client_name?: string | null;
  project_name?: string | null;
  total_cents: number;
  paid_at?: string | null;
  source: string;
};

export type UpcomingCollection = {
  id: string;
  invoice_number?: string | null;
  client_name?: string | null;
  project_name?: string | null;
  total_cents: number;
  due_at?: string | null;
};

export type PaymentSource = {
  source: string;
  count: number;
  amount_cents: number;
  pct: number;
};

export type CollectionsAiInsight = {
  insight: string;
  recommended_action: string;
  expected_recovery_cents: number;
  overdue_count: number;
  collection_probability: number;
  target_invoice_id?: string | null;
  target_invoice_number?: string | null;
  target_client_name?: string | null;
};

export type PaymentsDashboard = {
  summary: PaymentsSummary;
  cashflow: PaymentsCashflow;
  pipeline: CollectionPipeline;
  revenue_trend: RevenueTrendPoint[];
  recent_payments: RecentPayment[];
  upcoming: UpcomingCollection[];
  sources: PaymentSource[];
  ai_insight: CollectionsAiInsight;
};

export function formatPaidLabel(paidAt?: string | null): string {
  if (!paidAt) return "—";
  const d = new Date(paidAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatShortDate(paidAt);
}

export { formatInr, formatShortDate };
