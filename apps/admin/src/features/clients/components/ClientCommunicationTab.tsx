import { Mail, Phone, MessageCircle, FileText, Bell, Receipt } from "lucide-react";
import type { ClientCommunication } from "../schemas";
import { COMM_CHANNEL_LABELS, formatShortDate } from "../constants";
import { Badge } from "@/components/ui/badge";

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  meeting: Phone,
  proposal: FileText,
  invoice: Receipt,
  reminder: Bell,
};

export function ClientCommunicationTab({ communications }: { communications: ClientCommunication[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground mb-5">
        Relationship history — emails, calls, invoices, and reminders in one chronological feed.
      </p>
      <ol className="relative border-l border-border ml-3 space-y-6">
        {communications.length === 0 ? (
          <p className="text-sm text-muted-foreground ml-6">Activity appears as you log communications and send invoices.</p>
        ) : (
          communications.map((c) => {
            const ch = String(c.channel ?? "other");
            const Icon = CHANNEL_ICONS[ch] ?? Mail;
            const label = COMM_CHANNEL_LABELS[ch] ?? ch.replace(/_/g, " ");
            return (
              <li key={c.id} className="ml-6 relative">
                <span className="absolute -left-[1.65rem] flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline">{label}</Badge>
                  {c.createdAt && (
                    <span className="text-xs text-muted-foreground">{formatShortDate(c.createdAt)}</span>
                  )}
                </div>
                {c.subject && <p className="text-sm font-medium">{c.subject}</p>}
                {c.body && <p className="text-sm text-muted-foreground mt-1">{c.body}</p>}
              </li>
            );
          })
        )}
      </ol>
    </div>
  );
}
