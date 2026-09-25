import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { defaultInterviewDatetimeLocal, type CareerApplication } from "../careers.types";

type Setup = {
  email_configured: boolean;
  calendar_connected: boolean;
  from_address: string;
  reply_to: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: CareerApplication;
  setup?: Setup;
  loading?: boolean;
  onSubmit: (payload: { starts_at: string; duration_min: number; note: string }) => void;
};

export function CareersShortlistDialog({
  open,
  onOpenChange,
  application,
  setup,
  loading,
  onSubmit,
}: Props) {
  const [startsAt, setStartsAt] = useState(defaultInterviewDatetimeLocal);
  const [duration, setDuration] = useState("45");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setStartsAt(defaultInterviewDatetimeLocal());
    setDuration("45");
    setNote("");
  }, [open, application.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {application.status === "shortlisted" ? "Reschedule interview" : "Shortlist and schedule"}
          </DialogTitle>
          <DialogDescription>
            Moves {application.name} to the shortlisted pile and emails {application.email} with the slot
            {setup?.calendar_connected ? " and a Google Meet link." : ". Connect Google Calendar to attach a Meet link."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!setup?.email_configured ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Email is not configured on the API. Set RESEND_API_KEY before sending invites.
            </p>
          ) : null}
          {setup && !setup.calendar_connected ? (
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Google Calendar is not connected, so this email will go out with a calendar file but no Meet URL.{" "}
              <Link to="/settings/integrations" className="underline">
                Connect Calendar
              </Link>
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="interview-at">Interview time (IST)</Label>
            <Input
              id="interview-at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interview-note">Note in the email (optional)</Label>
            <Textarea
              id="interview-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bring a Figma file / we will walk through your GitHub repo…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            disabled={loading || !setup?.email_configured || !startsAt}
            onClick={() =>
              onSubmit({
                starts_at: startsAt,
                duration_min: Number(duration),
                note: note.trim(),
              })
            }
          >
            {loading ? "Sending…" : "Email invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
