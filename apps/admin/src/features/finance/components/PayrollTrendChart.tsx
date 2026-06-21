import { MiniChart } from "@/components/dashboard/mini-chart";
import type { PayrollTrendPoint } from "../payroll-schemas";
import { formatInr } from "../payroll-schemas";

export function PayrollTrendChart({ trend }: { trend: PayrollTrendPoint[] }) {
  const labels = trend.map((t) => t.month_label);
  const values = trend.map((t) => Math.round(t.payroll_cents / 100));
  const maxCents = Math.max(...trend.map((t) => t.payroll_cents), 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-semibold">Payroll trend</p>
        <p className="text-xs text-muted-foreground">Last 6 months</p>
      </div>
      {maxCents > 0 ? (
        <MiniChart data={values} labels={labels} activeColor="#8b5cf6" />
      ) : (
        <div className="flex items-end gap-1.5 h-24 mt-4 px-1">
          {labels.map((label) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-3 rounded-sm bg-muted" />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DepartmentCostsPanel({
  departments,
}: {
  departments: { department: string; amount_cents: number; pct: number }[];
}) {
  if (departments.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold mb-3">Cost per department</p>
      <div className="space-y-3">
        {departments.map((d) => (
          <div key={d.department}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium capitalize">{d.department}</span>
              <span className="tabular-nums text-muted-foreground">{formatInr(d.amount_cents)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(d.pct, 4)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
