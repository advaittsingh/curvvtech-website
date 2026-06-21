import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { formatInr, formatShortDate } from "../clients/constants";

export type InvoiceRecord = {
  id: string;
  invoice_number?: string;
  client_id?: string | null;
  client_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  status?: string;
  display_status?: string;
  total_cents?: number;
  amount_cents?: number;
  subtotal_cents?: number;
  tax_cents?: number;
  discount_cents?: number;
  due_at?: string | null;
  paid_at?: string | null;
  payment_link?: string | null;
  razorpay_order_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type InvoiceSummary = {
  collected_cents: number;
  pending_cents: number;
  overdue_cents: number;
  this_month_cents: number;
  total_billed_cents: number;
  collection_rate: number;
};

export type InvoiceFinanceInsight = {
  insight: string;
  recommended_action: string;
  collection_probability: number;
  expected_collection_date: string | null;
  risk_level: "low" | "medium" | "high";
  client_payment_note?: string;
};

export type InvoiceTimelineEvent = {
  key: string;
  title: string;
  description?: string;
  at?: string | null;
  state: "done" | "pending" | "upcoming";
};

export const INVOICE_TYPES = [
  { id: "milestone", label: "Milestone" },
  { id: "advance", label: "Advance" },
  { id: "final", label: "Final Payment" },
  { id: "retainer", label: "Retainer" },
  { id: "custom", label: "Custom" },
] as const;

export type InvoiceTypeId = (typeof INVOICE_TYPES)[number]["id"];

export const MILESTONE_SPLITS = [
  { label: "20% Advance", pct: 20, type: "advance" as const },
  { label: "40% Development", pct: 40, type: "milestone" as const },
  { label: "40% Final", pct: 40, type: "final" as const },
];

export const INVOICE_STATUS_META: Record<
  string,
  { label: string; emoji: string; badge: string }
> = {
  draft: { label: "Draft", emoji: "🟡", badge: "bg-amber-50 text-amber-800 border-amber-200" },
  sent: { label: "Sent", emoji: "🔵", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  pending: { label: "Pending", emoji: "🔵", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  paid: { label: "Paid", emoji: "🟢", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  overdue: { label: "Overdue", emoji: "🔴", badge: "bg-red-50 text-red-800 border-red-200" },
  cancelled: { label: "Cancelled", emoji: "⚪", badge: "bg-stone-100 text-stone-600 border-stone-200" },
};

export function invoiceStatus(invoice: InvoiceRecord): string {
  return String(invoice.display_status ?? invoice.status ?? "draft").toLowerCase();
}

export function statusMeta(status: string) {
  return INVOICE_STATUS_META[status] ?? INVOICE_STATUS_META.draft!;
}

export function invoiceTotal(invoice: InvoiceRecord): number {
  return Number(invoice.total_cents ?? invoice.amount_cents ?? 0);
}

export function formatDueLabel(dueAt?: string | null, status?: string): string {
  if (!dueAt || status === "paid") return "—";
  const date = parseISO(dueAt);
  const days = differenceInCalendarDays(date, new Date());
  if (days < 0) return `Overdue ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${format(date, "MMM d")}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Date.now()).slice(-4);
  return `INV-${year}-${seq}`;
}

export { formatInr, formatShortDate };
