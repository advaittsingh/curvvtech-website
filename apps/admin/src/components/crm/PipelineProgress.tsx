import { cn } from "@/lib/utils";

type Stage = { id: string; label: string };

type Props = {
  stages: Stage[];
  currentId: string;
  onStageChange?: (id: string) => void;
  className?: string;
};

export function PipelineProgress({ stages, currentId, onStageChange, className }: Props) {
  const currentIdx = stages.findIndex((s) => s.id === currentId);

  return (
    <div className={cn("rounded-xl border border-border bg-card px-4 py-4", className)}>
      <div className="flex items-start gap-2 overflow-x-auto pb-1">
        {stages.map((stage, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          const upcoming = idx > currentIdx;
          return (
            <div key={stage.id} className="flex items-start flex-1 min-w-[64px]">
              <button
                type="button"
                disabled={!onStageChange}
                onClick={() => onStageChange?.(stage.id)}
                className={cn(
                  "flex flex-col items-center gap-2 w-full group px-0.5",
                  onStageChange && "cursor-pointer",
                )}
              >
                <span
                  className={cn(
                    "flex h-3 w-3 shrink-0 rounded-full border-2 transition-all",
                    done && "bg-primary border-primary",
                    active && "bg-primary border-primary ring-2 ring-primary/25",
                    upcoming && "bg-background border-muted-foreground/40 group-hover:border-primary/50",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium text-center leading-snug w-full px-0.5",
                    active ? "text-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  {stage.label}
                </span>
              </button>
              {idx < stages.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 min-w-[12px] mx-1 mt-1.5 rounded-full shrink-0",
                    idx < currentIdx ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
