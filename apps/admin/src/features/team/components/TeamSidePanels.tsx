import { cn } from "@/lib/utils";
import type { TeamWorkload } from "../team-schemas";
import { workloadColor } from "../team-schemas";

export function WorkloadPanel({ workload }: { workload: TeamWorkload[] }) {
  if (workload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold mb-3">Team workload</p>
      <div className="space-y-3">
        {workload.map((w) => (
          <div key={w.user_id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium truncate pr-2">{w.name}</span>
              <span className={cn("text-xs font-semibold tabular-nums shrink-0", workloadColor(w.workload))}>
                {w.utilization_pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  w.utilization_pct >= 91 ? "bg-red-500" : w.utilization_pct >= 71 ? "bg-amber-500" : "bg-emerald-500",
                )}
                style={{ width: `${Math.max(w.utilization_pct, 4)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {w.active_tasks} active · {w.workload}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamActivityFeed({
  activity,
}: {
  activity: { id: string; message: string; created_at?: string | null }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">Recent team activity</p>
      </div>
      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4">Activity from tasks, invoices, and files will appear here.</p>
      ) : (
        <ul className="divide-y divide-border">
          {activity.map((a) => (
            <li key={a.id} className="px-4 py-3 text-sm">
              <p>{a.message}</p>
              {a.created_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HiringTracker({
  positions,
}: {
  positions: { id: string; title: string; department?: string | null; status: string }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold mb-3">Open positions</p>
      {positions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open roles tracked. Add positions when you start hiring.</p>
      ) : (
        <div className="space-y-2">
          {positions.map((p) => (
            <div key={p.id} className="rounded-lg border border-border/60 px-3 py-2">
              <p className="text-sm font-medium">{p.title}</p>
              {p.department && (
                <p className="text-xs text-muted-foreground capitalize">{p.department}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
