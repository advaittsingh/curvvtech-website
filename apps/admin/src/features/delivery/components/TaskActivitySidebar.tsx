import { formatDistanceToNow, parseISO } from "date-fns";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskActivityEvent, TaskSummary } from "../task-schemas";
import { describeActivity } from "../task-schemas";

type Props = {
  activity: TaskActivityEvent[];
  summary: TaskSummary | null | undefined;
  onGeneratePlan: () => void;
  loading?: boolean;
};

export function TaskActivitySidebar({ activity, summary, onGeneratePlan, loading }: Props) {
  const suggestions: string[] = [];
  if ((summary?.overdue ?? 0) > 0) {
    suggestions.push(`Reschedule or complete ${summary?.overdue} overdue task${summary?.overdue === 1 ? "" : "s"}.`);
  }
  if ((summary?.due_today ?? 0) > 0) {
    suggestions.push(`${summary?.due_today} task${summary?.due_today === 1 ? "" : "s"} due today — assign owners if unassigned.`);
  }
  if ((summary?.in_review ?? 0) > 0) {
    suggestions.push(`${summary?.in_review} in review — schedule client approvals.`);
  }
  if (suggestions.length === 0 && (summary?.total ?? 0) === 0) {
    suggestions.push("Convert a proposal to a project, then generate an AI delivery plan.");
    suggestions.push("Tasks auto-populate from milestones and project plans.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Workload looks healthy — focus on review column bottlenecks.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Recent activity</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Task moves, completions, and plan generation</p>
        <ul className="mt-3 space-y-3 max-h-[320px] overflow-y-auto">
          {activity.length === 0 ? (
            <li className="text-sm text-muted-foreground">No task activity yet.</li>
          ) : (
            activity.slice(0, 12).map((ev) => (
              <li key={ev.id} className="text-sm border-l-2 border-primary/30 pl-3">
                <p className="leading-snug">{describeActivity(ev)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(parseISO(ev.created_at), { addSuffix: true })}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-violet-950">AI suggestions</h3>
        </div>
        <ul className="mt-3 space-y-2">
          {suggestions.slice(0, 3).map((s, i) => (
            <li key={i} className={cn("text-xs text-violet-900/90 leading-relaxed")}>
              • {s}
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          className="w-full mt-3 gap-1.5 bg-violet-600 hover:bg-violet-700"
          onClick={onGeneratePlan}
          disabled={loading}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate project plan
        </Button>
      </div>
    </div>
  );
}
