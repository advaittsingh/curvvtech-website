import { Badge } from "@/components/ui/badge";
import { groupTimelineEvents } from "../lead.utils";
import { TimelineEventIcon } from "@/components/crm/TimelineEventIcon";
import { TimelineItem, TimelineList } from "@/components/crm/TimelineList";

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
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  whatsapp: "WhatsApp",
};

export function LeadTimelineTab({ events }: { events: TimelineEvent[] }) {
  const groups = groupTimelineEvents(events);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground mb-5">
        Business milestones — proposals, meetings, and deal progression. Logged automatically as you work the deal.
      </p>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Events appear as you schedule calls, send proposals, and close deals.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{group.label}</h3>
              <TimelineList>
                {group.events.map((ev, idx) => (
                  <TimelineItem
                    key={ev.id}
                    isLast={idx === group.events.length - 1}
                    icon={<TimelineEventIcon type={ev.type} />}
                  >
                    <div className="flex flex-wrap gap-2 items-center mb-1">
                      <Badge variant="outline">{TIMELINE_LABELS[ev.type] ?? ev.type.replace(/_/g, " ")}</Badge>
                      {ev.created_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(ev.created_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {ev.message && <p className="text-sm">{ev.message}</p>}
                  </TimelineItem>
                ))}
              </TimelineList>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
