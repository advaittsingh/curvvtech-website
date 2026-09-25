import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: string;
  onDraftChange: (value: string) => void;
  loading?: boolean;
  sending?: boolean;
  targetLabel?: string;
  onGenerate?: () => void;
  onSend?: () => void;
};

export function PaymentReminderDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  loading,
  sending,
  targetLabel,
  onGenerate,
  onSend,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment reminder</DialogTitle>
          <DialogDescription>
            {targetLabel
              ? `Send a payment reminder for ${targetLabel}. The client gets an email and a portal notification with a link to pay.`
              : "Send a payment reminder with a link to pay in the client portal."}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={8}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={loading ? "Generating reminder…" : "Optional custom message. Leave blank for the default reminder."}
          disabled={loading || sending}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          {onGenerate && (
            <Button type="button" variant="outline" size="sm" onClick={onGenerate} disabled={loading || sending}>
              {loading ? "Generating…" : "Customize with AI"}
            </Button>
          )}
          {onSend && (
            <Button type="button" size="sm" onClick={onSend} disabled={loading || sending}>
              {sending ? "Sending…" : "Send reminder"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
