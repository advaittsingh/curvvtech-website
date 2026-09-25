import type { ClientSummary } from "@/features/clients/schemas";
import { formatShortDate } from "@/features/clients/constants";
import { Badge } from "@/components/ui/badge";

type Event = { id: string; type?: string; message?: string; created_at?: string };

const TYPE_LABELS: Record<string, string> = {
  invoice_sent: "Invoice sent",
  payment_received: "Payment received",
  proposal_sent: "Proposal sent",
  proposal_viewed: "Proposal opened",
  client_created: "Client created",
  project_created: "Project created",
  call_completed: "Call logged",
  email: "Email",
};

export function RecentActivityWidget({ events }: { events: Event[] }) {
  const recent = events.slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h3 className="font-medium text-sm">Recent activity</h3>
      <ul className="space-y-3">
        {recent.map((ev) => (
          <li key={ev.id} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium truncate">{TYPE_LABELS[ev.type ?? ""] ?? ev.message ?? ev.type?.replace(/_/g, " ")}</p>
              {ev.message && ev.type && <p className="text-xs text-muted-foreground truncate mt-0.5">{ev.message}</p>}
            </div>
            {ev.created_at && (
              <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
                {formatShortDate(ev.created_at)}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function buildHealthFactors(summary: ClientSummary | null) {
  if (!summary) return [];
  const factors: { label: string; delta: number }[] = [];
  if (summary.total_received_cents > 0) factors.push({ label: "Invoices paid", delta: 20 });
  if (summary.last_interaction_at) {
    const days = Math.floor((Date.now() - new Date(summary.last_interaction_at).getTime()) / 86400000);
    if (days <= 7) factors.push({ label: "Recent replies", delta: 15 });
    else if (days > 14) factors.push({ label: "Slow response", delta: -10 });
  }
  if (summary.projects_active > 0) factors.push({ label: "Active project", delta: 20 });
  if (summary.invoices_pending >= 2) factors.push({ label: "Pending invoices", delta: -10 });
  if (summary.outstanding_cents > 0) factors.push({ label: "Outstanding balance", delta: -5 });
  return factors;
}
