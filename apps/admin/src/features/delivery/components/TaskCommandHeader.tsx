import { AlertCircle, CheckCircle2, ClipboardList, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskSummary } from "../task-schemas";

type Props = {
  summary: TaskSummary | null | undefined;
  onNewTask: () => void;
  onGeneratePlan: () => void;
  planLoading?: boolean;
};

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "primary" | "warning" | "danger" | "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm min-w-[120px]">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-semibold mt-0.5 tabular-nums",
          accent === "primary" && "text-primary",
          accent === "warning" && "text-amber-700",
          accent === "danger" && "text-red-600",
          accent === "success" && "text-emerald-700",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function TaskCommandHeader({ summary, onNewTask, onGeneratePlan, planLoading }: Props) {
  const s = summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Delivery</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Task Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-project workload, deadlines, and team ownership in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onGeneratePlan} disabled={planLoading}>
            <Sparkles className="h-3.5 w-3.5" />
            Generate plan
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onNewTask}>
            <Plus className="h-3.5 w-3.5" />
            New task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <MetricPill label="Total tasks" value={s?.total ?? "—"} accent="primary" />
        <MetricPill label="Due today" value={s?.due_today ?? "—"} accent="warning" />
        <MetricPill label="In review" value={s?.in_review ?? "—"} />
        <MetricPill label="Overdue" value={s?.overdue ?? "—"} accent={s?.overdue ? "danger" : undefined} />
        <MetricPill label="Due this week" value={s?.due_this_week ?? "—"} />
        <MetricPill
          label="Completion rate"
          value={s ? `${s.completion_rate}%` : "—"}
          accent="success"
        />
      </div>

      {(s?.overdue ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{s?.overdue}</strong> overdue task{(s?.overdue ?? 0) === 1 ? "" : "s"} need attention.
          </span>
        </div>
      )}

      {(s?.completed ?? 0) > 0 && (s?.completion_rate ?? 0) >= 80 && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Strong delivery velocity — {s?.completion_rate}% completion across all projects.</span>
        </div>
      )}

      {!s?.total && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4 shrink-0" />
          No tasks yet — generate a project plan or create your first task.
        </div>
      )}
    </div>
  );
}
