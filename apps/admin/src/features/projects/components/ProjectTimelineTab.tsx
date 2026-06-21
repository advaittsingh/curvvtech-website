import { Check, Circle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectMilestone } from "../project-schemas";
import { formatShortDate } from "../project-schemas";
import { cn } from "@/lib/utils";

type Props = {
  milestones: ProjectMilestone[];
  title: string;
  due: string;
  onTitle: (v: string) => void;
  onDue: (v: string) => void;
  onAdd: () => void;
  adding?: boolean;
  onComplete: (id: string) => void;
};

export function ProjectTimelineTab({ milestones, title, due, onTitle, onDue, onAdd, adding, onComplete }: Props) {
  const firstOpenIdx = milestones.findIndex((m) => !m.completed_at);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <ol className="relative space-y-0">
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No milestones — generate a project plan to populate the timeline.</p>
          ) : (
            milestones.map((m, idx) => {
              const done = Boolean(m.completed_at);
              const active = !done && idx === firstOpenIdx;
              const upcoming = !done && !active;
              return (
                <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {idx < milestones.length - 1 && (
                    <span className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                      done && "border-emerald-500 bg-emerald-500 text-white",
                      active && "border-primary bg-primary/10 text-primary",
                      upcoming && "border-muted-foreground/30 bg-background text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : active ? <span className="text-xs">●</span> : <Circle className="h-3 w-3" />}
                  </span>
                  <div className="flex-1 min-w-0 flex justify-between gap-2">
                    <div>
                      <p className={cn("font-semibold", done && "text-muted-foreground")}>{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {done && m.completed_at
                          ? `Completed ${formatShortDate(m.completed_at)}`
                          : m.due_at
                            ? formatShortDate(m.due_at)
                            : "Date TBD"}
                      </p>
                    </div>
                    {!done && (
                      <Button variant="ghost" size="sm" className="shrink-0 h-8 text-xs" onClick={() => onComplete(m.id)}>
                        Mark done
                      </Button>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ol>
      </div>

      <details className="rounded-lg border border-border bg-muted/20 px-3 py-2">
        <summary className="text-xs font-medium text-muted-foreground cursor-pointer select-none">Add milestone manually</summary>
        <div className="flex flex-wrap gap-2 mt-3 pb-1">
          <Input placeholder="Milestone title" value={title} onChange={(e) => onTitle(e.target.value)} className="max-w-xs h-9" />
          <Input type="date" value={due} onChange={(e) => onDue(e.target.value)} className="max-w-[160px] h-9" />
          <Button size="sm" className="gap-1 h-9" disabled={!title || adding} onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </details>
    </div>
  );
}
