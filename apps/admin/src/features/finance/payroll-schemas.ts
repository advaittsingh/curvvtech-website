import { format, parseISO } from "date-fns";
import { formatInr, formatShortDate } from "../clients/constants";

export const DEPARTMENTS = [
  { id: "engineering", label: "Engineering" },
  { id: "design", label: "Design" },
  { id: "operations", label: "Operations" },
  { id: "sales", label: "Sales" },
  { id: "general", label: "General" },
] as const;

export type CompensationProfile = {
  id: string;
  user_id?: string | null;
  name: string;
  display_name?: string | null;
  user_email?: string | null;
  employment_type: "employee" | "contractor" | string;
  role_title?: string | null;
  department?: string | null;
  monthly_salary_cents: number;
  pay_day?: number | null;
  next_pay_date?: string | null;
  joined_at?: string | null;
  is_active?: boolean;
};

export type PayrollSummary = {
  monthly_payroll_cents: number;
  employee_count: number;
  contractor_count: number;
  next_payroll_date: string | null;
};

export type PayrollDepartment = {
  department: string;
  amount_cents: number;
  headcount: number;
  pct: number;
};

export type PayrollTrendPoint = {
  month_label: string;
  month_start: string;
  payroll_cents: number;
};

export type UpcomingPayment = {
  id: string;
  kind: string;
  title: string;
  due_date?: string | null;
  amount_cents: number;
  status?: string;
};

export type PayrollRun = {
  id: string;
  period_start: string;
  period_end: string;
  period_label?: string | null;
  status: string;
  total_cents: number;
  generate_payslips?: boolean;
};

export type PayrollAiInsight = {
  insight: string;
  payroll_growth_pct: number | null;
  highest_cost_name: string | null;
  highest_cost_cents: number;
  upcoming_payout_cents: number;
  upcoming_days: number | null;
  contractor_count: number;
  recommended_action: string;
  risk_note: string | null;
};

export type PayrollDashboard = {
  summary: PayrollSummary;
  employees: CompensationProfile[];
  contractors: CompensationProfile[];
  departments: PayrollDepartment[];
  payroll_trend: PayrollTrendPoint[];
  upcoming: UpcomingPayment[];
  payroll_history: PayrollRun[];
  ai_insight: PayrollAiInsight;
};

export function departmentLabel(id?: string | null): string {
  if (!id) return "General";
  return DEPARTMENTS.find((d) => d.id === id)?.label ?? id.charAt(0).toUpperCase() + id.slice(1);
}

export function formatNextPayroll(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "d MMM");
  } catch {
    return formatShortDate(dateStr);
  }
}

export { formatInr, formatShortDate };
