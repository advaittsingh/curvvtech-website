import { useState } from "react";
import { formatOwnerDisplay } from "../constants";
import { ACTIVITY_FILTERS, matchesActivityFilter, type ActivityFilter } from "../lead.utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const filtered = events.filter((ev) => matchesActivityFilter(ev.type, filter));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <p className="text-sm text-muted-foreground">
          Team actions on this deal — status changes, assignments, notes, and uploads.
        </p>
        <div className="flex flex-wrap gap-1">
          {ACTIVITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                filter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-4">
        {filtered.length === 0 ? (
          <li className="text-sm text-muted-foreground">No activity in this filter yet.</li>
        ) : (
          filtered.map((ev) => {
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
