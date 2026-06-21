import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import type { InboundActivity } from "../demo-schemas";
import { formatShortDate } from "../constants";
import { Clock } from "lucide-react";

type Props = { demoId: string; enabled?: boolean };

export function DemoActivityTimeline({ demoId, enabled = true }: Props) {
  const api = useAdminApi();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "demo-requests", demoId, "activity"],
    queryFn: () => api.demoRequests.activity(demoId) as Promise<InboundActivity[]>,
    enabled: enabled && Boolean(demoId),
  });

  const events = Array.isArray(data) ? data : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-4">
        <Clock className="h-3.5 w-3.5" /> Activity timeline
      </h3>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && events.length === 0 && (
        <p className="text-sm text-muted-foreground">No activity yet — analyze or assign to start the timeline.</p>
      )}
      <ol className="space-y-0 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
        {events.map((ev) => (
          <li key={ev.id} className="relative pl-6 pb-4 last:pb-0">
            <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background" />
            <p className="text-sm font-medium leading-tight">{ev.title}</p>
            {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
            <p className="text-[10px] text-muted-foreground mt-1">{formatShortDate(ev.created_at)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
