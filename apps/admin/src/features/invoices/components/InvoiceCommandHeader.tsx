import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvoiceSummary } from "../invoice-schemas";
import { formatInr } from "../invoice-schemas";

type Props = {
  summary: InvoiceSummary | null | undefined;
  onNewInvoice: () => void;
};

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary" | "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-semibold mt-0.5 tabular-nums",
          accent === "primary" && "text-primary",
          accent === "success" && "text-emerald-700",
          accent === "warning" && "text-amber-700",
          accent === "danger" && "text-red-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function InvoiceCommandHeader({ summary, onNewInvoice }: Props) {
  const s = summary;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Finance</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Finance Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue, collections, and billing intelligence.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={onNewInvoice}>
          <Plus className="h-3.5 w-3.5" />
          New invoice
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <MetricPill label="Collected" value={formatInr(s?.collected_cents)} accent="success" />
        <MetricPill label="Pending" value={formatInr(s?.pending_cents)} accent="warning" />
        <MetricPill label="Overdue" value={formatInr(s?.overdue_cents)} accent={s?.overdue_cents ? "danger" : undefined} />
        <MetricPill label="This month" value={formatInr(s?.this_month_cents)} accent="primary" />
        <MetricPill label="Collection rate" value={s ? `${s.collection_rate}%` : "—"} />
      </div>
    </div>
  );
}

export function CollectionProgressBar({ summary }: { summary: InvoiceSummary | null | undefined }) {
  const collected = summary?.collected_cents ?? 0;
  const pending = summary?.pending_cents ?? 0;
  const total = collected + pending;
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold">Collection progress</p>
        <p className="text-sm font-semibold tabular-nums">{pct}%</p>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>{formatInr(collected)} collected</span>
        <span>{formatInr(pending)} pending</span>
      </div>
    </div>
  );
}
