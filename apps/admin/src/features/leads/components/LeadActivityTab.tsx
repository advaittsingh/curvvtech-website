import { formatOwnerDisplay } from "../constants";
import { Badge } from "@/components/ui/badge";

export type ActivityEvent = {
  id: string;
  type: string;
  message?: string;
  author_email?: string | null;
  created_at?: string;
};

const ACTIVITY_LABELS: Record<string, string> = {
  lead_created: "Lead created",
  status_change: "Status changed",
  note_added: "Note added",
  client_created: "Client created",
  proposal_generated: "Proposal generated",
  lead_assigned: "Lead assigned",
  file_uploaded: "File uploaded",
};

export function LeadActivityTab({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground mb-5">
        Team actions on this deal — status changes, assignments, notes, and uploads.
      </p>
      <ul className="space-y-4">
        {events.length === 0 ? (
          <li className="text-sm text-muted-foreground">Activity from your team will show up here.</li>
        ) : (
          events.map((ev) => {
            const author = formatOwnerDisplay(ev.author_email);
            return (
              <li key={ev.id} className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                  {author.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{author}</span>
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
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {ACTIVITY_LABELS[ev.type] ?? ev.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {ev.message && <p className="text-sm text-muted-foreground mt-1">{ev.message}</p>}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
