import { format, parseISO } from "date-fns";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvoiceFinanceInsight, InvoiceTimelineEvent } from "../invoice-schemas";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

export function InvoiceActivityTimeline({ events }: { events: InvoiceTimelineEvent[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">Activity</h3>
      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.key} className="flex gap-3">
            <div
              className={cn(
                "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
                ev.state === "done" ? "bg-emerald-500" : "bg-muted-foreground/30",
              )}
            />
            <div>
              <p className={cn("text-sm font-medium", ev.state !== "done" && "text-muted-foreground")}>{ev.title}</p>
              {ev.at && (
                <p className="text-[10px] text-muted-foreground">
                  {format(parseISO(ev.at), "MMM d, yyyy · h:mm a")}
                </p>
              )}
              {ev.description && <p className="text-[10px] text-muted-foreground">{ev.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InvoiceAiInsightPanel({ insight, loading }: { insight: InvoiceFinanceInsight | null | undefined; loading?: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 text-sm text-muted-foreground">
        Analyzing collection risk…
      </div>
    );
  }
  if (!insight) return null;

  const riskColors = {
    low: "border-emerald-200 bg-emerald-50/60",
    medium: "border-amber-200 bg-amber-50/60",
    high: "border-red-200 bg-red-50/60",
  };

  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", riskColors[insight.risk_level])}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold">AI finance insight</h3>
      </div>
      <p className="text-sm leading-relaxed">{insight.insight}</p>
      <p className="text-sm mt-2">
        <span className="font-medium">Recommended:</span> {insight.recommended_action}
      </p>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div className="rounded-lg bg-background/70 px-2 py-1.5">
          <p className="text-muted-foreground">Collection probability</p>
          <p className="font-semibold text-base">{insight.collection_probability}%</p>
        </div>
        <div className="rounded-lg bg-background/70 px-2 py-1.5">
          <p className="text-muted-foreground">Expected payment</p>
          <p className="font-semibold">{insight.expected_collection_date ?? "—"}</p>
        </div>
      </div>
      {insight.client_payment_note && (
        <p className="text-xs text-muted-foreground mt-3 border-t border-border/60 pt-2">{insight.client_payment_note}</p>
      )}
    </div>
  );
}

export function InvoiceDetailHeaderCard({
  invoiceNumber,
  clientName,
  projectName,
  total,
  status,
}: {
  invoiceNumber: string;
  clientName: string;
  projectName?: string | null;
  total: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Invoice</p>
          <h1 className="text-2xl font-bold tracking-tight">{invoiceNumber}</h1>
          <p className="text-base font-medium mt-1">{clientName}</p>
          {projectName && <p className="text-sm text-muted-foreground">{projectName}</p>}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums">{total}</p>
          <InvoiceStatusBadge status={status} className="mt-2" />
        </div>
      </div>
    </div>
  );
}

export function InvoiceTotalsCard({
  subtotal,
  tax,
  discount,
  total,
}: {
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm max-w-sm ml-auto">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{subtotal}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">GST / Tax</span><span>{tax}</span></div>
        {discount !== "—" && (
          <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>{discount}</span></div>
        )}
        <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
          <span>TOTAL</span><span>{total}</span>
        </div>
      </div>
    </div>
  );
}

export function InvoiceFinanceSummary({
  amount,
  paid,
  outstanding,
  dueLabel,
}: {
  amount: string;
  paid: string;
  outstanding: string;
  dueLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {[
        { label: "Invoice amount", value: amount },
        { label: "Paid", value: paid },
        { label: "Outstanding", value: outstanding },
        { label: "Due in", value: dueLabel },
      ].map((m) => (
        <div key={m.label} className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{m.label}</p>
          <p className="font-semibold mt-0.5">{m.value}</p>
        </div>
      ))}
    </div>
  );
}
