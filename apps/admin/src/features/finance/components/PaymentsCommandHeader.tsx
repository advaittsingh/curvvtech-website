import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaymentsSummary } from "../payments-schemas";
import { formatInr } from "../payments-schemas";

type Props = {
  summary: PaymentsSummary | null | undefined;
  onCreateInvoice: () => void;
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

export function PaymentsCommandHeader({ summary, onCreateInvoice }: Props) {
  const s = summary;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Finance</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Revenue & Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">Cash flow, collections pipeline, and payment intelligence.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={onCreateInvoice}>
          <Plus className="h-3.5 w-3.5" />
          Create invoice
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <MetricPill label="Collected" value={formatInr(s?.collected_cents)} accent="success" />
        <MetricPill label="Pending" value={formatInr(s?.pending_cents)} accent="warning" />
        <MetricPill label="Overdue" value={formatInr(s?.overdue_cents)} accent={s?.overdue_cents ? "danger" : undefined} />
        <MetricPill label="Expected this month" value={formatInr(s?.expected_this_month_cents)} accent="primary" />
        <MetricPill label="Collection rate" value={s ? `${s.collection_rate}%` : "—"} />
      </div>
    </div>
  );
}
