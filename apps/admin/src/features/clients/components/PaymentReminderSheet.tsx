import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  channel: string;
  onChannelChange: (v: string) => void;
  onGenerate: () => void;
  onLogCommunication: () => void;
};

export function PaymentReminderSheet({
  open,
  onOpenChange,
  loading,
  draft,
  onDraftChange,
  channel,
  onChannelChange,
  onGenerate,
  onLogCommunication,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Payment reminder</SheetTitle>
          <SheetDescription>AI drafts a reminder for the oldest pending invoice.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={onChannelChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onGenerate} disabled={loading} className="w-full">
            {loading ? "Generating…" : "Generate with AI"}
          </Button>
          {draft && (
            <>
              <Textarea value={draft} onChange={(e) => onDraftChange(e.target.value)} rows={10} />
              <Button variant="outline" className="w-full" onClick={onLogCommunication}>
                Log as communication
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
