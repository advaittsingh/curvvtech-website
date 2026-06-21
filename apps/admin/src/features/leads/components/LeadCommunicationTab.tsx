import type { ComponentType } from "react";
import { Mail, Phone, MessageCircle, Calendar } from "lucide-react";
import type { Lead } from "../schemas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  lead: Lead;
  emailDraft: string;
  onEmailDraftChange: (v: string) => void;
  onDraftEmail: () => void;
  onScheduleCall: () => void;
};

export function LeadCommunicationTab({
  lead,
  emailDraft,
  onEmailDraftChange,
  onDraftEmail,
  onScheduleCall,
}: Props) {
  return (
    <div className="space-y-4">
      {lead.next_follow_up_at && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
          Next follow-up: {new Date(lead.next_follow_up_at).toLocaleString("en-IN")}
        </div>
      )}

      <CommSection icon={Mail} title="Emails" description="Sent, opened, and replied — syncs as you connect email.">
        <div className="flex flex-wrap gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={onDraftEmail}>Draft email with AI</Button>
        </div>
        {emailDraft ? (
          <Textarea value={emailDraft} onChange={(e) => onEmailDraftChange(e.target.value)} rows={8} />
        ) : (
          <p className="text-xs text-muted-foreground">No emails logged yet. Use AI to draft your first follow-up.</p>
        )}
      </CommSection>

      <CommSection icon={Phone} title="Calls" description="Scheduled, completed, and missed calls.">
        <Button variant="outline" size="sm" onClick={onScheduleCall}>Schedule call</Button>
        <p className="text-xs text-muted-foreground mt-3">Call logs from AI dialer will appear here.</p>
      </CommSection>

      <CommSection icon={MessageCircle} title="WhatsApp" description="Message history with this lead.">
        <p className="text-xs text-muted-foreground">WhatsApp integration coming soon — messages will sync automatically.</p>
      </CommSection>
    </div>
  );
}

function CommSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
