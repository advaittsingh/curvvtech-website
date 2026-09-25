import { Mail, Phone, MessageCircle, FileText, Bell, Receipt } from "lucide-react";
import type { ClientCommunication } from "../schemas";
import { COMM_CHANNEL_LABELS, formatShortDate } from "../constants";
import { CrmEmptyState } from "@/components/crm/CrmEmptyState";
import { TimelineItem, TimelineList } from "@/components/crm/TimelineList";
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

type Props = {
  communications: ClientCommunication[];
  onConnect?: () => void;
};

export function ClientCommunicationTab({ communications, onConnect }: Props) {
  if (communications.length === 0) {
    return (
      <CrmEmptyState
        title="No communication yet"
        description="Connect Gmail to automatically sync emails with this client, or log calls and messages manually."
        icon={<Mail className="h-6 w-6" />}
        actionLabel="Connect Gmail"
        onAction={onConnect}
        secondaryLabel="Log activity manually"
        onSecondary={() => onConnect?.()}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground mb-5">
        Relationship history — emails, calls, invoices, and reminders in one chronological feed.
      </p>
      <TimelineList>
        {communications.map((c, idx) => {
          const ch = String(c.channel ?? "other");
          const Icon = CHANNEL_ICONS[ch] ?? Mail;
          const label = COMM_CHANNEL_LABELS[ch] ?? ch.replace(/_/g, " ");
          return (
            <TimelineItem
              key={c.id}
              isLast={idx === communications.length - 1}
              icon={
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              }
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="outline">{label}</Badge>
                {c.createdAt && (
                  <span className="text-xs text-muted-foreground">{formatShortDate(c.createdAt)}</span>
                )}
              </div>
              {c.subject && <p className="text-sm font-medium">{c.subject}</p>}
              {c.body && <p className="text-sm text-muted-foreground mt-1">{c.body}</p>}
            </TimelineItem>
          );
        })}
      </TimelineList>
    </div>
  );
}
