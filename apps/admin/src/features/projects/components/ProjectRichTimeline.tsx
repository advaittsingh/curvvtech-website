import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { cn } from "@/lib/utils";
import { buildPhasesFromProgress, formatShortDate } from "../project-schemas";
import { ProjectPanelError } from "./ProjectPanelError";

type Props = { projectId: string; progressPct?: number };

export function ProjectRichTimeline({ projectId, progressPct = 0 }: Props) {
  const api = useAdminApi();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "projects", projectId, "rich-timeline"],
    queryFn: () => api.projects.richTimeline(projectId),
    enabled: Boolean(projectId),
    retry: 1,
  });

  if (isLoading) return <div className="h-64 rounded-xl bg-muted/30 animate-pulse" />;

  const phases = Array.isArray(data?.phases)
    ? data.phases as { key: string; label: string; status: string; progress: number }[]
    : buildPhasesFromProgress(progressPct);

  if (isError && phases.length === 0) {
    return (
      <ProjectPanelError
        title="Timeline unavailable"
        message={error instanceof Error ? error.message : "Could not load timeline from the server."}
        onRetry={() => void refetch()}
      />
    );
  }

  const phaseEvents = (data?.phase_events ?? {}) as Record<string, { id: string; title: string; created_at: string }[]>;

  return (
    <div className="relative pl-4">
      {phases.map((phase, idx) => {
        const done = phase.status === "done";
        const active = phase.status === "in_progress";
        const events = phaseEvents[phase.key] ?? [];

        return (
          <motion.div
            key={phase.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="relative pb-8 last:pb-0"
          >
            {idx < phases.length - 1 && <span className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />}
            <div className="flex gap-4">
              <span className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                done && "border-emerald-500 bg-emerald-500 text-white",
                active && "border-primary bg-primary/15 text-primary",
                !done && !active && "border-muted-foreground/30",
              )}>
                {done ? <Check className="h-3.5 w-3.5" /> : active ? <span className="h-2 w-2 rounded-full bg-primary" /> : <Circle className="h-3 w-3 text-muted-foreground" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={cn("font-semibold text-sm", done && "text-muted-foreground")}>{phase.label}</h4>
                  <span className="text-xs text-muted-foreground tabular-nums">{phase.progress}%</span>
                </div>
                {events.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 rounded-lg bg-muted/30 p-2.5">
                    {events.map((e) => (
                      <li key={e.id} className="text-xs flex justify-between gap-2">
                        <span className="truncate">{e.title}</span>
                        <time className="text-muted-foreground shrink-0">{formatShortDate(e.created_at)}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-1">No events in this phase yet.</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
