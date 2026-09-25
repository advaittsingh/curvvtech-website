import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectProgressRing } from "./ProjectProgressRing";
import type { ProjectRecord, ProjectSummary } from "../project-schemas";
import { PROJECT_STATUS_LABELS, deriveProgressPct } from "../project-schemas";
import { cn } from "@/lib/utils";

type Props = {
  project: ProjectRecord;
  summary?: ProjectSummary | null;
  onPatch?: (body: object) => void;
  onGeneratePlan?: () => void;
  onCreateInvoice?: () => void;
  onAnalyze?: () => void;
  planLoading?: boolean;
};

function ringColor(project: ProjectRecord, progress: number): string {
  if (project.status === "completed" || progress >= 100) return "#22c55e";
  if (progress >= 50) return "#14b8a6";
  return project.color ?? "#6366f1";
}

export function ProjectCommandHeader({
  project,
  summary,
  onPatch,
  onGeneratePlan,
  onCreateInvoice,
  onAnalyze,
  planLoading,
}: Props) {
  const status = project.status ?? "planning";
  const statusLabel = PROJECT_STATUS_LABELS[status] ?? status;
  const progress = deriveProgressPct(project, summary);
  const color = ringColor(project, progress);
  const isCompleted = status === "completed";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <ProjectProgressRing value={progress} size={56} stroke={4} color={color} className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {onPatch ? (
                <Input
                  defaultValue={project.name ?? "Project"}
                  key={`name-${project.id}-${project.name}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== project.name) onPatch({ name: v });
                  }}
                  className="h-9 text-xl font-bold tracking-tight max-w-[320px] border-transparent bg-transparent px-0 hover:border-border focus:border-border shadow-none"
                />
              ) : (
                <h1 className="text-xl font-bold tracking-tight truncate">{project.name ?? "Project"}</h1>
              )}
              {onPatch ? (
                <Select value={status} onValueChange={(v) => onPatch({ status: v })}>
                  <SelectTrigger
                    className={cn(
                      "h-7 w-auto gap-1 text-xs font-medium px-2.5 rounded-md border",
                      isCompleted
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-muted/50 border-border",
                    )}
                  >
                    <SelectValue>{statusLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-0.5 rounded-md border shrink-0",
                    isCompleted ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-muted text-muted-foreground",
                  )}
                >
                  {statusLabel}
                </span>
              )}
              {onPatch ? (
                <Input
                  defaultValue={project.project_type ?? ""}
                  key={`type-${project.id}-${project.project_type}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (project.project_type ?? "")) onPatch({ project_type: v || null });
                  }}
                  placeholder="Project type"
                  className="h-7 min-w-[10rem] max-w-[14rem] text-xs border-border bg-muted/30 hidden sm:inline-flex"
                />
              ) : project.project_type ? (
                <span className="text-xs text-muted-foreground bg-muted/50 border border-border px-2.5 py-0.5 rounded-md hidden sm:inline">
                  {project.project_type}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {project.client_company ?? project.client_name ?? "Client"}
              {project.referred_by && (
                <span>
                  {" "}
                  · Referred by {project.referred_by}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {onGeneratePlan && (
            <Button size="sm" className="gap-1.5 h-9 px-4 bg-foreground text-background hover:bg-foreground/90" onClick={onGeneratePlan} disabled={planLoading}>
              <Sparkles className="h-3.5 w-3.5" /> Plan
            </Button>
          )}
          {onCreateInvoice && (
            <Button variant="outline" size="sm" className="h-9 px-4" onClick={onCreateInvoice}>
              Invoice
            </Button>
          )}
          {onAnalyze && (
            <Button variant="outline" size="sm" className="h-9 px-4" onClick={onAnalyze}>
              Refresh AI
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
