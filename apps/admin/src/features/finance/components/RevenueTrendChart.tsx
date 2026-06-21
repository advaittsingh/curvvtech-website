import { MiniChart } from "@/components/dashboard/mini-chart";
import type { RevenueTrendPoint } from "../payments-schemas";
import { formatInr } from "../payments-schemas";

type Props = {
  trend: RevenueTrendPoint[];
};

export function RevenueTrendChart({ trend }: Props) {
  const labels = trend.map((t) => t.month_label);
  const values = trend.map((t) => Math.round(t.collected_cents / 100));
  const maxCents = Math.max(...trend.map((t) => t.collected_cents), 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-semibold">Revenue trend</p>
        <p className="text-xs text-muted-foreground">Last 6 months</p>
      </div>
      {maxCents > 0 ? (
        <MiniChart data={values} labels={labels} activeColor="#10b981" />
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
      {maxCents > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Peak month: {formatInr(maxCents)}
        </p>
      )}
    </div>
  );
}
