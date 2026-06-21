import type { ClientTimelineEvent } from "../schemas";
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
};

export function ClientTimelineTab({ events }: { events: ClientTimelineEvent[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground mb-5">Full lifecycle from lead won through delivery and payment.</p>
      <ol className="relative border-l border-border ml-3 space-y-6">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground ml-6">Timeline builds automatically as you work this account.</p>
        ) : (
          events.map((ev) => (
            <li key={ev.id} className="ml-6 relative">
              <span className="absolute -left-[1.65rem] flex h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="outline">{LABELS[ev.type] ?? ev.type.replace(/_/g, " ")}</Badge>
                {ev.created_at && <span className="text-xs text-muted-foreground">{formatShortDate(ev.created_at)}</span>}
              </div>
              {ev.message && <p className="text-sm">{ev.message}</p>}
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
