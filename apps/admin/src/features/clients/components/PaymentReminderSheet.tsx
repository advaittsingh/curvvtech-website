import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatInr } from "../constants";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  sending: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  invoiceLabel?: string;
  invoiceAmountCents?: number;
  onGenerate: () => void;
  onSend: () => void;
};

export function PaymentReminderSheet({
  open,
  onOpenChange,
  loading,
  sending,
  draft,
  onDraftChange,
  invoiceLabel,
  invoiceAmountCents,
  onGenerate,
  onSend,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Payment reminder</SheetTitle>
          <SheetDescription>
            Sends an email and in-app notification in the client portal with a link to pay via Razorpay.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {invoiceLabel && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{invoiceLabel}</p>
              {invoiceAmountCents != null && (
                <p className="text-muted-foreground mt-1">{formatInr(invoiceAmountCents)} outstanding</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Custom message (optional)</Label>
            <Textarea
              className="mt-1"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              rows={6}
              placeholder="Leave blank for the default reminder, or generate a draft with AI below."
            />
          </div>

          <Button variant="outline" onClick={onGenerate} disabled={loading || sending} className="w-full">
            {loading ? "Generating…" : "Customize with AI"}
          </Button>

          <Button onClick={onSend} disabled={sending || loading} className="w-full">
            {sending ? "Sending…" : "Send reminder"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
