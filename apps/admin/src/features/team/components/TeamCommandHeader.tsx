import { cn } from "@/lib/utils";
import type { TeamSummary } from "../team-schemas";

type Props = {
  summary: TeamSummary | null | undefined;
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

export function TeamCommandHeader({ summary }: Props) {
  const s = summary;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">People</p>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Members, roles, workload, and capacity planning.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricPill label="Team members" value={String(s?.member_count ?? 0)} accent="primary" />
        <MetricPill label="Departments" value={String(s?.department_count ?? 0)} />
        <MetricPill label="Open tasks" value={String(s?.open_tasks ?? 0)} accent="warning" />
        <MetricPill label="Capacity used" value={s ? `${s.capacity_used_pct}%` : "—"} accent="success" />
      </div>
    </div>
  );
}
