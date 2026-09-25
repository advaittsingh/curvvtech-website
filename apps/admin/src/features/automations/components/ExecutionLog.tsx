import { CheckCircle2, XCircle, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime, runIsFailed, humanize } from "../automations.utils";
import type { WorkflowRun } from "../automations.types";

export function ExecutionLog({ runs }: { runs: WorkflowRun[] }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Execution log</h2>
        <span className="text-xs text-muted-foreground">Recent workflow activity</span>
      </div>
      {runs.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No workflow runs yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {runs.map((run) => {
            const failed = runIsFailed(run);
            return (
              <li key={run.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      failed ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600",
                    )}
                  >
                    {failed ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{run.workflow_name ?? "Workflow"}</div>
                    <div className="text-xs text-muted-foreground">
                      {run.entity_type ? humanize(run.entity_type) : "Trigger"}
                      {run.status ? ` · ${humanize(run.status)}` : failed ? " · Failed" : " · Completed"}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(run.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
