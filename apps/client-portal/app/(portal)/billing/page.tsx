"use client";

import { useEffect, useState } from "react";
import { Receipt, CreditCard, Banknote, ChevronDown, Download, CheckCircle2 } from "lucide-react";
import { api, money, openDoc } from "@/lib/api";
import { openRazorpayCheckout, type RazorpayOrder } from "@/lib/razorpay-checkout";
import {
  SectionCard,
  PageHeader,
  Badge,
  Empty,
  Btn,
  Skeleton,
  formatDate,
  relativeTime,
  PaymentJourney,
  Breadcrumbs,
  cn,
} from "@/components/ui";

type Invoice = {
  id: string;
  invoice_number: string;
  title: string | null;
  status: string;
  tax_cents: number;
  total_cents: number;
  amount_cents: number;
  due_at: string | null;
  paid_at: string | null;
  created_at?: string | null;
  payment_method: string | null;
  payment_reference: string | null;
};
type Payment = {
  id: string;
  invoice_number: string;
  title: string | null;
  total_cents: number;
  amount_cents: number;
  paid_at: string | null;
  method: string;
  payment_reference: string | null;
};
type BillingSummary = {
  project_value_cents: number;
  paid_cents: number;
  remaining_cents: number;
  payment_steps: { title: string; status: "paid" | "pending" | "upcoming"; amount_cents?: number }[];
};

/** Colour + label for an invoice status so clients scan colour before text. */
function statusVisual(status: string): { chip: string; dot: string } {
  switch (status) {
    case "paid":
      return { chip: "bg-[var(--ok-bg)] text-[var(--ok)]", dot: "var(--ok)" };
    case "overdue":
      return { chip: "bg-[var(--danger-bg)] text-[var(--danger)]", dot: "var(--danger)" };
    case "draft":
      return { chip: "bg-[var(--info-bg)] text-[var(--info)]", dot: "var(--info)" };
    default: // sent / viewed / pending / partial
      return { chip: "bg-[var(--orange-bg)] text-[var(--orange)]", dot: "var(--orange)" };
  }
}

function invoiceLabel(inv: { title: string | null; invoice_number: string }): string {
  return inv.title && inv.title.trim() ? inv.title.trim() : inv.invoice_number;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [docBusy, setDocBusy] = useState<string | null>(null);

  function reload() {
    Promise.all([
      api<BillingSummary>("/billing/summary").then(setSummary),
      api<{ invoices: Invoice[] }>("/invoices").then((r) => setInvoices(r.invoices)),
      api<{ payments: Payment[] }>("/payments").then((r) => setPayments(r.payments)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }
  useEffect(reload, []);

  async function pay(inv: Invoice) {
    setPaying(inv.id);
    setPayError(null);
    try {
      const order = await api<RazorpayOrder>(`/invoices/${inv.id}/pay`, { method: "POST" });
      await openRazorpayCheckout({
        order,
        name: "Curvvtech",
        description: inv.invoice_number,
        onSuccess: async (resp) => {
          await api(`/invoices/${inv.id}/verify-payment`, {
            method: "POST",
            body: JSON.stringify(resp),
          });
          reload();
        },
        onError: (msg) => setPayError(msg),
        onCancel: () => setPayError("Payment cancelled"),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      if (msg !== "Payment cancelled") setPayError(msg);
    } finally {
      setPaying(null);
    }
  }

  async function openDocument(key: string, path: string) {
    setDocBusy(key);
    try {
      await openDoc(path);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Document not available");
    } finally {
      setDocBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const showOverview = true;
  const showInvoices = true;
  const showPayments = true;

  // Financial summary context derived from what we already fetched.
  const nextStep = summary?.payment_steps.find((s) => s.status !== "paid") ?? null;
  const nextLabel = nextStep ? `Due after ${nextStep.title}` : null;
  const gstApplied = invoices.some((i) => i.tax_cents > 0);

  return (
    <div className="cp-animate">
      <Breadcrumbs items={[{ label: "Billing" }]} />
      <PageHeader title="Billing" subtitle="Your payment journey, invoices, and receipts." />

      {payError && (
        <div className="mb-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
          {payError}
        </div>
      )}

      {summary && showOverview && (
        <div className="mb-6">
          <PaymentJourney
            projectValue={summary.project_value_cents}
            paid={summary.paid_cents}
            remaining={summary.remaining_cents}
            steps={summary.payment_steps}
            nextLabel={nextLabel}
            invoiceCount={invoices.length}
            receiptCount={payments.length}
            gstLabel={gstApplied ? "Included" : "Not applicable"}
          />
        </div>
      )}

      {showInvoices && (
        <SectionCard title="Invoices" icon={Receipt} className="mb-6" bodyClassName="p-0">
          {invoices.length === 0 ? (
            <div className="p-6">
              <Empty title="No invoices generated yet" hint="Invoices will appear here automatically when your team creates one — with download and pay options." icon={Receipt} />
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {invoices.map((inv) => {
                const open = expanded === inv.id;
                const vis = statusVisual(inv.status);
                const amount = money(inv.total_cents || inv.amount_cents);
                return (
                  <div key={inv.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : inv.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] text-left transition"
                    >
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", vis.chip)}>
                        <CreditCard size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{invoiceLabel(inv)}</div>
                        <div className="text-xs text-[var(--muted)]">
                          Invoice {inv.invoice_number}
                          {" · "}
                          {inv.status === "paid" ? `Paid ${relativeTime(inv.paid_at)}` : inv.due_at ? `Due ${formatDate(inv.due_at)}` : "Due on receipt"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold">{amount}</div>
                        <Badge status={inv.status} className="mt-1" />
                      </div>
                      <ChevronDown size={16} className={cn("text-[var(--muted)] transition shrink-0", open && "rotate-180")} />
                    </button>
                    {open && (
                      <div className="px-5 pb-4 pt-0 border-t border-[var(--border)] bg-[var(--panel-2)]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm py-4">
                          <Detail label="Invoice number" value={inv.invoice_number} />
                          <Detail label="Generated" value={formatDate(inv.created_at)} />
                          <Detail label="Amount" value={amount} />
                          {inv.status === "paid" ? (
                            <>
                              <Detail label="Payment date" value={formatDate(inv.paid_at)} />
                              <Detail label="Payment method" value={inv.payment_method ?? "—"} />
                              <Detail label="Transaction ID" value={inv.payment_reference ?? "—"} mono />
                            </>
                          ) : (
                            <Detail label="Due" value={inv.due_at ? formatDate(inv.due_at) : "On receipt"} />
                          )}
                          <Detail label="GST" value={inv.tax_cents > 0 ? `Included · ${money(inv.tax_cents)}` : "Not applicable"} />
                          <Detail
                            label="Status"
                            value={
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ background: vis.dot }} />
                                <span className="capitalize">{inv.status === "paid" ? "Paid" : inv.status.replace(/_/g, " ")}</span>
                              </span>
                            }
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Btn
                            variant="outline"
                            size="sm"
                            onClick={() => openDocument(`pdf-${inv.id}`, `/invoices/${inv.id}/pdf`)}
                            disabled={docBusy === `pdf-${inv.id}`}
                          >
                            <Download size={14} /> {docBusy === `pdf-${inv.id}` ? "Opening…" : "Invoice PDF"}
                          </Btn>
                          {inv.status === "paid" && (
                            <Btn
                              variant="outline"
                              size="sm"
                              onClick={() => openDocument(`rcpt-${inv.id}`, `/invoices/${inv.id}/receipt`)}
                              disabled={docBusy === `rcpt-${inv.id}`}
                            >
                              <Receipt size={14} /> {docBusy === `rcpt-${inv.id}` ? "Opening…" : "GST Receipt"}
                            </Btn>
                          )}
                          {inv.status !== "paid" && (
                            <Btn size="sm" onClick={() => pay(inv)} disabled={paying === inv.id}>
                              {paying === inv.id ? "…" : `Pay ${amount}`}
                            </Btn>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {showPayments && (
        <SectionCard title="Payment history" icon={CheckCircle2} bodyClassName="p-0">
          {payments.length === 0 ? (
            <div className="p-6">
              <Empty title="No payments yet" hint="Successful Razorpay payments will appear here with downloadable receipts." icon={CheckCircle2} />
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {payments.map((p) => {
                const MethodIcon = p.method === "Razorpay" ? CreditCard : Banknote;
                return (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="h-10 w-10 rounded-xl bg-[var(--ok-bg)] text-[var(--ok)] flex items-center justify-center shrink-0">
                      <MethodIcon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold leading-tight">{money(p.total_cents || p.amount_cents)}</div>
                      <div className="text-xs text-[var(--muted)] mt-0.5">
                        Paid via {p.method} · {formatDate(p.paid_at)}
                      </div>
                      <div className="text-xs text-[var(--muted-2)] truncate">
                        {invoiceLabel(p)} · {p.invoice_number}
                      </div>
                    </div>
                    <Btn
                      variant="outline"
                      size="sm"
                      onClick={() => openDocument(`rcpt-${p.id}`, `/invoices/${p.id}/receipt`)}
                      disabled={docBusy === `rcpt-${p.id}`}
                      className="shrink-0"
                    >
                      <Download size={14} /> {docBusy === `rcpt-${p.id}` ? "…" : "Receipt"}
                    </Btn>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[var(--muted)] text-xs">{label}</div>
      <div className={cn("font-medium mt-0.5 truncate", mono && "font-mono text-xs")}>{value}</div>
    </div>
  );
}
