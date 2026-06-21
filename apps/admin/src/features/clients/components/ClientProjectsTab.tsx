import { Link } from "react-router-dom";
import type { ClientProject } from "../schemas";
import { formatOwnerDisplay, formatShortDate, PROJECT_STATUS_LABELS } from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function ClientProjectsTab({ projects }: { projects: ClientProject[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        No projects yet. Create a project to start delivery for this client.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-card p-5 space-y-4 hover:border-primary/30 transition-colors">
          <div className="space-y-1">
            <h3 className="font-semibold leading-tight">{p.name ?? "Untitled project"}</h3>
            <Badge variant="outline" className="capitalize">
              {PROJECT_STATUS_LABELS[String(p.status ?? "")] ?? p.status ?? "Planning"}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{p.progress_pct ?? 0}%</span>
            </div>
            <Progress value={p.progress_pct ?? 0} className="h-2" />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Due</dt>
              <dd className="font-medium">{p.target_end_date ? formatShortDate(p.target_end_date) : "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Manager</dt>
              <dd className="font-medium truncate">{formatOwnerDisplay(p.manager_email)}</dd>
            </div>
          </dl>
          <Button size="sm" className="w-full" asChild>
            <Link to={`/projects/${p.id}`}>View project</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
