import type { DeliveryPhase } from "../project-schemas";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { phases: DeliveryPhase[] };

const pillClass: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_progress: "bg-primary/10 text-primary border-primary/30",
  pending: "bg-muted text-muted-foreground border-border",
};

const pillLabel: Record<string, string> = {
  done: "Completed",
  in_progress: "In progress",
  pending: "Upcoming",
};

export function PhaseProgressBar({ phases }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Delivery roadmap</p>
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-0 sm:gap-0">
        {phases.map((phase, i) => (
          <div key={phase.key} className="flex sm:flex-1 min-w-0">
            <div className="flex sm:flex-col sm:flex-1 gap-3 sm:gap-2 py-2 sm:py-0 sm:px-2">
              <div className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center flex-1">
                <PhaseIcon phase={phase} />
                <div className="flex-1 sm:w-full min-w-0">
                  <span className={cn("inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border mb-1", pillClass[phase.status])}>
                    {pillLabel[phase.status]}
                  </span>
                  <p className={cn("font-semibold text-sm", phase.status === "pending" && "text-muted-foreground")}>
                    {phase.label}
                  </p>
                  {phase.status === "in_progress" && phase.progress != null && (
                    <p className="text-xs text-primary mt-0.5">{phase.progress}% complete</p>
                  )}
                </div>
              </div>
            </div>
            {i < phases.length - 1 && (
              <div className="hidden sm:flex items-center px-1 text-muted-foreground/40 self-center">→</div>
            )}
            {i < phases.length - 1 && (
              <div className="sm:hidden border-l border-border ml-3 pl-3 my-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseIcon({ phase }: { phase: DeliveryPhase }) {
  if (phase.status === "done") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (phase.status === "in_progress") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-sm font-bold text-primary">
        ◐
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/25 text-muted-foreground/50 text-sm">
      ○
    </span>
  );
}
