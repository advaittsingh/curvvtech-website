import { Badge } from "@/components/ui/badge";
import type { ProjectRecord, ProjectSummary } from "../project-schemas";
import { PROJECT_STATUS_LABELS, formatDueIn, formatInr } from "../project-schemas";
import { cn } from "@/lib/utils";

type Props = {
  project: ProjectRecord;
  summary: ProjectSummary | null | undefined;
};

export function ProjectCommandHeader({ project, summary }: Props) {
  const progress = Number(project.progress_pct ?? 0);
  const status = PROJECT_STATUS_LABELS[project.status ?? "planning"] ?? project.status ?? "Planning";

  const dueIn =
    summary?.next_milestone_due_at
      ? formatDueIn(Math.ceil((new Date(summary.next_milestone_due_at).getTime() - Date.now()) / 86400000))
      : summary?.days_until_end != null
        ? formatDueIn(summary.days_until_end)
        : "—";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name ?? "Project"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{project.client_name ?? "Client"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-medium">{status}</Badge>
          {summary && (
            <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-md">
              Day {summary.days_elapsed} of {summary.total_days}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <MetricCard label="Progress" value={`${progress}%`} highlight />
        <MetricCard label="Budget" value={formatInr(summary?.budget_cents ?? project.budget_cents)} />
        <MetricCard label="Collected" value={formatInr(summary?.collected_cents)} accent="emerald" />
        <MetricCard label="Pending" value={formatInr(summary?.pending_cents)} />
        <MetricCard label="Next milestone" value={summary?.next_milestone ?? "—"} small />
        <MetricCard label="Due in" value={dueIn} />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight,
  accent,
  small,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: "emerald";
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-semibold truncate mt-0.5",
          highlight && "text-xl text-primary",
          accent === "emerald" && "text-emerald-700",
          small && "text-sm",
          !highlight && !small && "text-base",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
