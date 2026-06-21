import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExpensesSummary } from "../expense-schemas";
import { formatInr } from "../expense-schemas";

type Props = {
  summary: ExpensesSummary | null | undefined;
  onAddExpense: () => void;
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

export function ExpensesCommandHeader({ summary, onAddExpense }: Props) {
  const s = summary;
  const margin = s?.profit_margin ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Finance</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Expenses & Profitability</h1>
          <p className="text-sm text-muted-foreground mt-1">Track spending, margins, and business health.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={onAddExpense}>
          <Plus className="h-3.5 w-3.5" />
          Add expense
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricPill label="Monthly spend" value={formatInr(s?.monthly_spend_cents)} accent="warning" />
        <MetricPill label="Revenue" value={formatInr(s?.revenue_cents)} accent="primary" />
        <MetricPill
          label="Profit"
          value={formatInr(s?.profit_cents)}
          accent={(s?.profit_cents ?? 0) >= 0 ? "success" : "danger"}
        />
        <MetricPill
          label="Profit margin"
          value={s ? `${margin}%` : "—"}
          accent={margin >= 50 ? "success" : margin >= 20 ? undefined : "warning"}
        />
      </div>
    </div>
  );
}
