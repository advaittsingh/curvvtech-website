"use client";

import { ListChecks } from "lucide-react";
import { Progress, Btn } from "@/components/ui";
import type { TaskProgress } from "@/lib/workspace";

type Props = {
  progress: TaskProgress | null | undefined;
  projectId?: string;
  compact?: boolean;
  /** Hide the progress bar (compact cards often show % in text only). */
  showBar?: boolean;
};

export function TaskProgressSummary({ progress, projectId, compact, showBar = true }: Props) {
  if (!progress || progress.total === 0) {
    return (
      <div className={compact ? "text-xs text-[var(--muted)]" : "text-sm text-[var(--muted)]"}>
        Task tracking will appear as your team adds work items.
      </div>
    );
  }

  const pct = Math.round((progress.done / progress.total) * 100);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`rounded-lg bg-[var(--purple-bg)] text-[var(--purple)] flex items-center justify-center shrink-0 ${compact ? "h-7 w-7" : "h-9 w-9"}`}>
            <ListChecks size={compact ? 14 : 16} />
          </div>
          <div className="min-w-0">
            <div className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>
              {progress.done} of {progress.total} tasks done
            </div>
            <div className={`text-[var(--muted)] ${compact ? "text-xs" : "text-sm"}`}>
              {progress.remaining} remaining
              {progress.client_visible_open > 0 ? ` · ${progress.client_visible_open} need your action` : ""}
            </div>
          </div>
        </div>
        <div className={`font-bold text-[var(--brand)] shrink-0 ${compact ? "text-sm" : "text-lg"}`}>{pct}%</div>
      </div>
      {showBar && <Progress value={pct} tone="brand" />}
      {!compact && projectId && progress.client_visible_open > 0 && (
        <Btn href={`/projects/${projectId}?tab=Tasks`} variant="soft" size="sm" className="w-full sm:w-auto">
          View your tasks
        </Btn>
      )}
    </div>
  );
}
