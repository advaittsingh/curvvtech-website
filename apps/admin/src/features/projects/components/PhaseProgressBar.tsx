import type { DeliveryPhase } from "../project-schemas";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { phases: DeliveryPhase[] };

const pillClass: Record<string, string> = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-foreground text-background border-foreground",
  pending: "bg-muted/80 text-muted-foreground border-border",
};

const pillLabel: Record<string, string> = {
  done: "Completed",
  in_progress: "In progress",
  pending: "Upcoming",
};

export function PhaseProgressBar({ phases }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Delivery roadmap</p>
      <div className="flex flex-col sm:flex-row sm:items-start gap-0">
        {phases.map((phase, i) => (
          <div key={phase.key} className="flex sm:flex-1 min-w-0">
            <div className="flex sm:flex-col sm:flex-1 sm:items-center sm:text-center gap-3 sm:gap-2 py-2 sm:py-0 sm:px-1">
              <PhaseIcon phase={phase} />
              <div className="flex-1 sm:w-full min-w-0">
                <span
                  className={cn(
                    "inline-block text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border mb-1.5",
                    pillClass[phase.status],
                  )}
                >
                  {pillLabel[phase.status]}
                </span>
                <p
                  className={cn(
                    "font-semibold text-sm",
                    phase.status === "pending" && "text-muted-foreground",
                  )}
                >
                  {phase.label}
                </p>
                {phase.status === "in_progress" && phase.progress != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">{phase.progress}% complete</p>
                )}
              </div>
            </div>
            {i < phases.length - 1 && (
              <div className="hidden sm:flex items-center px-2 text-muted-foreground/50 self-start mt-3 text-sm">→</div>
            )}
            {i < phases.length - 1 && (
              <div className="sm:hidden border-l border-border ml-4 pl-4 my-1" />
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
        <Check className="h-4 w-4 stroke-[2.5]" />
      </span>
    );
  }
  if (phase.status === "in_progress") {
    return (
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-background overflow-hidden">
        <span className="absolute inset-0 bg-foreground" style={{ clipPath: "inset(0 50% 0 0)" }} />
        <span className="relative z-10 h-2.5 w-2.5 rounded-full bg-background border border-foreground" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-background" />
  );
}
