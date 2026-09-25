import { ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { flowSteps } from "../automations.utils";
import type { Workflow } from "../automations.types";

export function WorkflowFlowDiagram({ workflow, className }: { workflow: Workflow; className?: string }) {
  const steps = flowSteps(workflow);
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {steps.map((step, i) => (
        <div key={`${step.label}-${i}`} className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
              step.kind === "trigger"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-700",
            )}
          >
            {step.kind === "trigger" && <Zap className="h-3 w-3" />}
            {step.label}
          </span>
          {i < steps.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}
