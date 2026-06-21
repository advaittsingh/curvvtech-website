import { formatInr } from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";

type Event = {
  id: string;
  event_type: string;
  created_at?: string;
  metadata?: { note?: string; client_id?: string; total_cents?: number };
};

type Props = {
  status: string;
  shareUrl?: string;
  events: Event[];
  totalCents?: number;
  onConvert?: () => void;
  convertLoading?: boolean;
};

export function ProposalApprovalPanel({ status, shareUrl, events, totalCents, onConvert, convertLoading }: Props) {
  const changeRequests = events.filter((e) => e.event_type === "changes_requested");
  const approvedEvent = events.find((e) => e.event_type === "approved");
  const shared = ["sent", "viewed", "negotiation", "approved", "rejected", "converted"].includes(status);

  if (!shared && status === "draft") {
    return (
      <aside className="rounded-xl border border-dashed border-border bg-muted/30 p-4 space-y-2">
        <h3 className="font-medium text-sm">Approval workflow</h3>
        <p className="text-xs text-muted-foreground">
          Share this proposal to send the client an approval link with Approve, Request Changes, and Reject options.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-xl border border-border bg-card p-4 space-y-4 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h3 className="font-medium text-sm truncate">Approval workflow</h3>
        <Badge variant="outline" className="capitalize shrink-0">{status}</Badge>
      </div>

      {shareUrl && (
        <div className="space-y-2 min-w-0">
          <p className="text-xs text-muted-foreground">Client link</p>
          <input
            readOnly
            value={shareUrl}
            className="w-full min-w-0 text-xs rounded-md border border-input bg-muted/50 px-2 py-1.5 truncate"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full"
              onClick={() => window.open(shareUrl, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Open
            </Button>
          </div>
        </div>
      )}

      {status === "negotiation" && changeRequests.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-900">Change requests</p>
          {changeRequests.slice(0, 3).map((ev) => (
            <p key={ev.id} className="text-xs text-amber-800">
              {ev.metadata?.note ?? "Client requested changes"}
              {ev.created_at && (
                <span className="block text-amber-600 mt-0.5">
                  {new Date(ev.created_at).toLocaleString("en-IN")}
                </span>
              )}
            </p>
          ))}
        </div>
      )}

      {status === "approved" && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-2">
          <p className="text-xs font-medium text-emerald-900">Approved</p>
          {approvedEvent?.metadata?.total_cents != null && (
            <p className="text-xs text-emerald-800">Final value: {formatInr(Number(approvedEvent.metadata.total_cents))}</p>
          )}
          {approvedEvent?.created_at && (
            <p className="text-xs text-emerald-700">
              {new Date(approvedEvent.created_at).toLocaleString("en-IN")}
            </p>
          )}
          {onConvert && (
            <Button size="sm" className="w-full mt-2" onClick={onConvert} disabled={convertLoading}>
              Create project
            </Button>
          )}
        </div>
      )}

      {status === "converted" && (
        <p className="text-xs text-muted-foreground">Converted to project with milestone invoices and client portal invite.</p>
      )}

      {status === "rejected" && (
        <p className="text-xs text-red-600">Client declined this proposal.</p>
      )}

      {!approvedEvent && totalCents != null && totalCents > 0 && status !== "rejected" && (
        <p className="text-xs text-muted-foreground">Proposal value: {formatInr(totalCents)}</p>
      )}
    </aside>
  );
}
