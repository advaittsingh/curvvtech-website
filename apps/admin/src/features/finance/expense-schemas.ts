import { formatInr, formatShortDate } from "../clients/constants";

export const EXPENSE_CATEGORIES = [
  { id: "software", label: "Software" },
  { id: "marketing", label: "Marketing" },
  { id: "payroll", label: "Payroll" },
  { id: "travel", label: "Travel" },
  { id: "operations", label: "Operations" },
  { id: "office", label: "Office" },
  { id: "utilities", label: "Utilities" },
  { id: "taxes", label: "Taxes" },
  { id: "general", label: "General" },
  { id: "other", label: "Other" },
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]["id"];

export const CATEGORY_COLORS: Record<string, string> = {
  marketing: "#f59e0b",
  payroll: "#8b5cf6",
  software: "#3b82f6",
  operations: "#10b981",
  travel: "#ec4899",
  office: "#6366f1",
  utilities: "#14b8a6",
  taxes: "#ef4444",
  general: "#94a3b8",
  other: "#64748b",
};

export type ExpenseRecord = {
  id: string;
  category: string;
  description: string;
  amount_cents: number;
  expense_date: string;
  vendor?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  status: string;
  receipt_url?: string | null;
};

export type ExpensesSummary = {
  monthly_spend_cents: number;
  revenue_cents: number;
  profit_cents: number;
  profit_margin: number;
};

export type ExpenseBurn = {
  monthly_burn_cents: number;
  runway_months: number | null;
  cash_position_cents: number;
};

export type ExpenseCategoryBreakdown = {
  category: string;
  amount_cents: number;
  count: number;
  pct: number;
};

export type ProjectProfitability = {
  id: string;
  name: string;
  revenue_cents: number;
  expense_cents: number;
  profit_cents: number;
  margin_pct: number;
};

export type ExpenseAiInsight = {
  insight: string;
  largest_category: string | null;
  largest_category_cents: number;
  month_over_month_pct: number | null;
  potential_savings_cents: number;
  recommended_action: string;
};

export type ExpensesDashboard = {
  summary: ExpensesSummary;
  burn: ExpenseBurn;
  categories: ExpenseCategoryBreakdown[];
  recent_expenses: ExpenseRecord[];
  project_profitability: ProjectProfitability[];
  ai_insight: ExpenseAiInsight;
};

export type ReceiptScanResult = {
  description: string;
  vendor: string | null;
  amount_cents: number;
  category: string;
  expense_date: string;
  gst_cents: number | null;
};

export function categoryLabel(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id.charAt(0).toUpperCase() + id.slice(1);
}

export function formatExpenseDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatShortDate(dateStr);
}

export { formatInr, formatShortDate };
