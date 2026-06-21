import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import type { ProjectActivity } from "../project-schemas";
import { formatShortDate } from "../project-schemas";

type Props = { projectId: string };

export function ProjectActivityFeed({ projectId }: Props) {
  const api = useAdminApi();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "projects", projectId, "activity"],
    queryFn: () => api.projects.activity(projectId) as Promise<ProjectActivity[]>,
    enabled: Boolean(projectId),
  });

  const events = Array.isArray(data) ? data : [];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h3>
      </div>
      <div className="p-3 max-h-[280px] overflow-y-auto">
        {isLoading && <p className="text-xs text-muted-foreground py-2">Loading…</p>}
        {!isLoading && events.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No activity yet — analyze or assign to start the timeline.</p>
        )}
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="text-sm border-b border-border/60 pb-2 last:border-0 last:pb-0">
              <p className="font-medium leading-tight text-[13px]">{ev.title}</p>
              {ev.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</p>}
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatShortDate(ev.created_at)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
