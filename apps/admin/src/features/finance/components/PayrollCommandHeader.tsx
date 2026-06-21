import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PayrollSummary } from "../payroll-schemas";
import { formatInr, formatNextPayroll } from "../payroll-schemas";

type Props = {
  summary: PayrollSummary | null | undefined;
  onCreateRun: () => void;
};

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary" | "success" | "warning";
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
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PayrollCommandHeader({ summary, onCreateRun }: Props) {
  const s = summary;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">People & Finance</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Payroll & Compensation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage salaries, contractors, payouts and payroll runs.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={onCreateRun}>
          <Plus className="h-3.5 w-3.5" />
          Create payroll run
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricPill label="Monthly payroll" value={formatInr(s?.monthly_payroll_cents)} accent="primary" />
        <MetricPill label="Active employees" value={String(s?.employee_count ?? 0)} accent="success" />
        <MetricPill label="Contractors" value={String(s?.contractor_count ?? 0)} />
        <MetricPill label="Next payroll" value={formatNextPayroll(s?.next_payroll_date)} accent="warning" />
      </div>
    </div>
  );
}
