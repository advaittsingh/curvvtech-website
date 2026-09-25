import type { ClientTimelineEvent } from "../schemas";
import { TimelineEventIcon } from "@/components/crm/TimelineEventIcon";
import { TimelineItem, TimelineList } from "@/components/crm/TimelineList";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "../constants";

const LABELS: Record<string, string> = {
  lead_won: "Lead won",
  client_created: "Client created",
  project_created: "Project created",
  project_delivered: "Project delivered",
  invoice_generated: "Invoice generated",
  invoice_sent: "Invoice sent",
  payment_received: "Payment received",
  client_archived: "Client archived",
  client_restored: "Client restored",
  client_deleted: "Client deleted",
};

export function ClientTimelineTab({ events }: { events: ClientTimelineEvent[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground mb-5">Full lifecycle from lead won through delivery and payment.</p>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Timeline builds automatically as you work this account.</p>
      ) : (
        <TimelineList>
          {events.map((ev, idx) => (
            <TimelineItem
              key={ev.id}
              isLast={idx === events.length - 1}
              icon={<TimelineEventIcon type={ev.type} />}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="outline">{LABELS[ev.type] ?? ev.type.replace(/_/g, " ")}</Badge>
                {ev.created_at && <span className="text-xs text-muted-foreground">{formatShortDate(ev.created_at)}</span>}
              </div>
              {ev.message && <p className="text-sm">{ev.message}</p>}
            </TimelineItem>
          ))}
        </TimelineList>
      )}
    </div>
  );
}
