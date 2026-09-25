import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CareerApplication } from "../careers.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: CareerApplication;
  emailConfigured?: boolean;
  loading?: boolean;
  onSubmit: (payload: { send_email: boolean; note: string }) => void;
};

export function CareersRejectDialog({
  open,
  onOpenChange,
  application,
  emailConfigured = true,
  loading,
  onSubmit,
}: Props) {
  const [sendEmail, setSendEmail] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setSendEmail(emailConfigured);
    setNote("");
  }, [open, application.id, emailConfigured]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject {application.name}?</DialogTitle>
          <DialogDescription>
            Moves this application to the rejected pile for {application.role_title}.
            {sendEmail
              ? ` A template email will be sent to ${application.email} saying they have not been shortlisted.`
              : " No email will be sent."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <Label htmlFor="send-reject-email" className="text-sm font-normal">
              Send not-shortlisted email
            </Label>
            <Switch
              id="send-reject-email"
              checked={sendEmail}
              onCheckedChange={setSendEmail}
              disabled={!emailConfigured}
            />
          </div>
          {!emailConfigured ? (
            <p className="text-sm text-destructive">Email is not configured on the API, so the template cannot be sent.</p>
          ) : null}
          {sendEmail ? (
            <div className="space-y-1.5">
              <Label htmlFor="reject-note">Extra line in the email (optional)</Label>
              <Textarea
                id="reject-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="We will keep your profile for a later round…"
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={loading || (sendEmail && !emailConfigured)}
            onClick={() => onSubmit({ send_email: sendEmail, note: note.trim() })}
          >
            {loading ? "Working…" : sendEmail ? "Reject and email" : "Reject without email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
