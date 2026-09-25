import { format, subMonths, startOfMonth, parseISO, isValid } from "date-fns";
import type { InvoiceRecord, InvoiceSummary } from "@/features/invoices/invoice-schemas";
import { invoiceStatus, invoiceTotal } from "@/features/invoices/invoice-schemas";
import type { PaymentsDashboard } from "./payments-schemas";

function paymentSource(inv: InvoiceRecord): string {
  if (inv.razorpay_order_id || String(inv.payment_link ?? "").startsWith("order:")) return "Razorpay";
  if (String(inv.payment_link ?? "").toLowerCase().includes("upi")) return "UPI";
  return "Bank Transfer";
}

export function buildPaymentsDashboardFallback(
  summary: InvoiceSummary,
  invoices: InvoiceRecord[],
): PaymentsDashboard {
  const now = new Date();
  const monthStarts = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));

  const paid = invoices.filter((inv) => invoiceStatus(inv) === "paid");
  const open = invoices.filter((inv) => !["paid", "cancelled", "draft"].includes(invoiceStatus(inv)));

  const revenue_trend = monthStarts.map((monthStart) => {
    const next = startOfMonth(subMonths(monthStart, -1));
    const collected_cents = paid.reduce((sum, inv) => {
      const ref = inv.paid_at ?? inv.createdAt;
      if (!ref) return sum;
      const d = parseISO(ref);
      if (!isValid(d) || d < monthStart || d >= next) return sum;
      return sum + invoiceTotal(inv);
    }, 0);
    return {
      month_label: format(monthStart, "MMM"),
      month_start: monthStart.toISOString(),
      collected_cents,
    };
  });

  const overdue_cents = open.reduce((sum, inv) => {
    if (!inv.due_at || new Date(inv.due_at) >= now) return sum;
    return sum + invoiceTotal(inv);
  }, 0);

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthEnd = startOfMonth(subMonths(now, -1));

  const due_this_week_cents = open.reduce((sum, inv) => {
    if (!inv.due_at) return sum;
    const d = new Date(inv.due_at);
    if (d < now || d >= weekEnd) return sum;
    return sum + invoiceTotal(inv);
  }, 0);

  const due_this_month_cents = open.reduce((sum, inv) => {
    if (!inv.due_at) return sum;
    const d = new Date(inv.due_at);
    if (d < startOfMonth(now) || d >= monthEnd) return sum;
    return sum + invoiceTotal(inv);
  }, 0);

  const future_cents = open.reduce((sum, inv) => {
    if (!inv.due_at) return sum;
    if (new Date(inv.due_at) < monthEnd) return sum;
    return sum + invoiceTotal(inv);
  }, 0);

  const collected_this_week_cents = paid.reduce((sum, inv) => {
    const ref = inv.paid_at ?? inv.createdAt;
    if (!ref) return sum;
    const d = new Date(ref);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    if (d < weekStart) return sum;
    return sum + invoiceTotal(inv);
  }, 0);

  const collected_this_month_cents = paid.reduce((sum, inv) => {
    const ref = inv.paid_at ?? inv.createdAt;
    if (!ref) return sum;
    const d = new Date(ref);
    if (d < startOfMonth(now)) return sum;
    return sum + invoiceTotal(inv);
  }, 0);

  const avg_invoice_cents =
    paid.length > 0 ? Math.round(paid.reduce((s, inv) => s + invoiceTotal(inv), 0) / paid.length) : 0;

  const sourceMap = new Map<string, { count: number; cents: number }>();
  for (const inv of paid) {
    const src = paymentSource(inv);
    const cents = invoiceTotal(inv);
    const cur = sourceMap.get(src) ?? { count: 0, cents: 0 };
    sourceMap.set(src, { count: cur.count + 1, cents: cur.cents + cents });
  }
  const totalSourceCents = [...sourceMap.values()].reduce((s, v) => s + v.cents, 0) || 1;
  const sources = [...sourceMap.entries()]
    .map(([source, v]) => ({
      source,
      count: v.count,
      amount_cents: v.cents,
      pct: Math.round((v.cents / totalSourceCents) * 100),
    }))
    .sort((a, b) => b.amount_cents - a.amount_cents);

  const recent_payments = [...paid]
    .sort((a, b) => new Date(b.paid_at ?? b.createdAt ?? 0).getTime() - new Date(a.paid_at ?? a.createdAt ?? 0).getTime())
    .slice(0, 20)
    .map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      client_name: inv.client_name,
      project_name: inv.project_name,
      total_cents: invoiceTotal(inv),
      paid_at: inv.paid_at ?? inv.createdAt,
      source: paymentSource(inv),
    }));

  const upcoming = [...open]
    .filter((inv) => inv.due_at)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 12)
    .map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      client_name: inv.client_name,
      project_name: inv.project_name,
      total_cents: invoiceTotal(inv),
      due_at: inv.due_at,
    }));

  const overdue_count = open.filter((inv) => inv.due_at && new Date(inv.due_at) < now).length;

  return {
    summary: {
      collected_cents: summary.collected_cents,
      pending_cents: summary.pending_cents,
      overdue_cents: summary.overdue_cents,
      expected_this_month_cents: due_this_month_cents,
      collection_rate: summary.collection_rate,
    },
    cashflow: {
      collected_this_week_cents,
      collected_this_month_cents,
      avg_invoice_cents,
      collection_rate: summary.collection_rate,
    },
    pipeline: {
      overdue_cents,
      due_this_week_cents,
      due_this_month_cents,
      future_cents,
    },
    revenue_trend,
    recent_payments,
    upcoming,
    sources,
    ai_insight: {
      insight:
        overdue_count > 0
          ? `${overdue_count} invoice${overdue_count === 1 ? "" : "s"} overdue.`
          : "Collections look healthy based on invoice data.",
      recommended_action:
        overdue_count > 0 ? "Send reminders for overdue invoices." : "Create and send invoices to accelerate cash flow.",
      expected_recovery_cents: overdue_cents,
      overdue_count,
      collection_probability: overdue_count > 0 ? 85 : 95,
      target_invoice_id: upcoming[0]?.id ?? null,
      target_invoice_number: upcoming[0]?.invoice_number ?? null,
      target_client_name: upcoming[0]?.client_name ?? null,
    },
  };
}
