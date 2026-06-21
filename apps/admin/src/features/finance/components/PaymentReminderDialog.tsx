import { Copy } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: string;
  onDraftChange: (value: string) => void;
  loading?: boolean;
  targetLabel?: string;
};

export function PaymentReminderDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  loading,
  targetLabel,
}: Props) {
  const { toast } = useToast();

  async function copyDraft() {
    if (!draft.trim()) return;
    await navigator.clipboard.writeText(draft);
    toast({ title: "Copied to clipboard" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment reminder</DialogTitle>
          <DialogDescription>
            {targetLabel
              ? `AI draft for ${targetLabel}. Review, copy, or send via your preferred channel.`
              : "Review the AI-generated reminder before sending."}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={10}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={loading ? "Generating reminder…" : "Reminder text will appear here."}
          disabled={loading}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copyDraft} disabled={!draft.trim()}>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
