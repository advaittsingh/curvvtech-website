import { BarChart3, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { dailyRunBuckets } from "../automations.utils";
import type { AutomationStats } from "../automations.utils";
import type { WorkflowRun } from "../automations.types";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function AutomationAnalytics({ runs, stats }: { runs: WorkflowRun[]; stats: AutomationStats }) {
  const buckets = dailyRunBuckets(runs);
  const max = Math.max(1, ...buckets.map((b) => b.total));
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Analytics</h2>
        <span className="text-xs text-muted-foreground">Last 7 days</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total runs" value={String(stats.totalRuns)} />
        <Metric label="Success rate" value={`${stats.successRate}%`} />
        <Metric label="Errors" value={String(stats.failed)} />
        <Metric label="Time saved" value={`${stats.timeSavedHrs} hrs`} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Run trend
        </div>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {buckets.map((b, i) => {
            const okHeight = ((b.total - b.failed) / max) * 100;
            const failHeight = (b.failed / max) * 100;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 flex-col justify-end gap-0.5">
                  {b.failed > 0 && (
                    <div className="w-full rounded-t bg-red-400" style={{ height: `${failHeight}%` }} />
                  )}
                  <div
                    className={cn("w-full bg-emerald-400", b.failed === 0 && "rounded-t")}
                    style={{ height: `${okHeight}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{b.day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
