import { Badge } from "@/components/ui/badge";

export type TimelineEvent = {
  id: string;
  type: string;
  message?: string;
  created_at?: string;
};

const TIMELINE_LABELS: Record<string, string> = {
  created: "Lead created",
  status_change: "Status updated",
  proposal: "Proposal created",
  proposal_sent: "Proposal sent",
  proposal_viewed: "Proposal viewed",
  proposal_approved: "Proposal approved",
  proposal_rejected: "Proposal rejected",
  proposal_generated: "Proposal generated",
  client_created: "Client created",
  discovery_call: "Discovery call",
  call_scheduled: "Call scheduled",
  call_completed: "Meeting completed",
  negotiation: "Negotiation started",
};

export function LeadTimelineTab({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground mb-5">
        Business milestones — proposals, meetings, and deal progression. Logged automatically as you work the deal.
      </p>
      <ol className="relative border-l border-border ml-3 space-y-6">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground ml-6">Events appear as you schedule calls, send proposals, and close deals.</p>
        ) : (
          events.map((ev) => (
            <li key={ev.id} className="ml-6 relative">
              <span className="absolute -left-[1.65rem] flex h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <Badge variant="outline">{TIMELINE_LABELS[ev.type] ?? ev.type.replace(/_/g, " ")}</Badge>
                {ev.created_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {ev.message && <p className="text-sm">{ev.message}</p>}
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
