import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink, Mail, Phone, RotateCcw, Star, Video } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradientAvatar } from "@/components/crm/GradientAvatar";
import { useToast } from "@/hooks/use-toast";
import { CareersRejectDialog } from "../components/CareersRejectDialog";
import { CareersShortlistDialog } from "../components/CareersShortlistDialog";
import {
  formatAppliedAt,
  formatFileSize,
  formatInterviewIst,
  pileFromSearch,
  type CareerApplication,
} from "../careers.types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground break-words">{children}</div>
    </div>
  );
}

function statusBadge(status: CareerApplication["status"]) {
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (status === "shortlisted") return <Badge>Shortlisted</Badge>;
  return <Badge variant="secondary">New</Badge>;
}

export default function CareersApplicationPage() {
  const { slug = "", id = "" } = useParams();
  const [params] = useSearchParams();
  const pile = pileFromSearch(params.get("pile"));
  const pileQuery = pile === "new" ? "" : `?pile=${pile}`;
  const api = useAdminApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "careers", "application", id],
    queryFn: () => api.careers.get(id),
    enabled: Boolean(id),
  });

  const setupQuery = useQuery({
    queryKey: ["admin", "careers", "setup"],
    queryFn: () => api.careers.setup(),
  });

  const application = data as CareerApplication | undefined;
  const resumeTooSmall =
    application != null &&
    application.resume_size_bytes != null &&
    application.resume_size_bytes < 1024;

  useEffect(() => {
    if (!id || !application) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setResumeUrl(null);
    if (resumeTooSmall) {
      setResumeError(
        "This CV was never saved as a real file — only a tiny placeholder. Ask the candidate to re-apply with their original PDF.",
      );
      return;
    }
    setResumeError(null);
    api.careers
      .resumeBlob(id)
      .then((blob) => {
        if (cancelled) return;
        if (blob.size < 1024 || blob.type.includes("json")) {
          setResumeError("This CV file is empty or invalid. Ask the candidate to re-apply with their original PDF.");
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setResumeUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setResumeError("Could not load this CV. The file may be missing from storage.");
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [api, id, application?.id, resumeTooSmall]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin", "careers"] });
  }

  const restore = useMutation({
    mutationFn: () => api.careers.updateStatus(id, "new"),
    onSuccess: () => {
      invalidate();
      toast({ title: "Restored to applicants" });
      navigate(`/careers/${slug}`);
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const shortlist = useMutation({
    mutationFn: (payload: { starts_at: string; duration_min: number; note: string }) =>
      api.careers.shortlist(id, payload),
    onSuccess: (updated) => {
      invalidate();
      setShortlistOpen(false);
      toast({
        title: updated.meet_created ? "Shortlisted — Meet invite sent" : "Shortlisted — email sent",
        description: updated.meet_created
          ? "Calendar event and Google Meet link are in the email."
          : updated.calendar_error || "Calendar was not connected, so the invite went out with an .ics file only.",
      });
      navigate(`/careers/${slug}?pile=shortlisted`);
    },
    onError: (e: Error) => toast({ title: "Shortlist failed", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: (payload: { send_email: boolean; note: string }) => api.careers.reject(id, payload),
    onSuccess: (updated) => {
      invalidate();
      setRejectOpen(false);
      toast({
        title: updated.email_sent ? "Rejected — template emailed" : "Moved to rejected pile",
      });
      navigate(`/careers/${slug}?pile=rejected`);
    },
    onError: (e: Error) => toast({ title: "Reject failed", description: e.message, variant: "destructive" }),
  });

  const busy = restore.isPending || shortlist.isPending || reject.isPending;

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading application…</div>;
  }

  if (!application) {
    return (
      <div className="p-6">
        <BackendErrorAlert error={error} />
        <p className="text-sm text-muted-foreground">Application not found.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to={`/careers/${slug}${pileQuery}`}>Back to role</Link>
        </Button>
      </div>
    );
  }

  const isImage = application.resume_content_type.startsWith("image/");
  const isPdf = application.resume_content_type === "application/pdf";

  return (
    <div className="p-6">
      <Link
        to={`/careers/${slug}${pileQuery}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {application.role_title}
      </Link>
      <PageHeader
        title={application.name}
        description={`${application.role_title} · applied ${formatAppliedAt(application.created_at)}`}
        action={
          application.status === "rejected" ? (
            <Button variant="outline" className="gap-2" onClick={() => restore.mutate()} disabled={busy}>
              <RotateCcw className="h-4 w-4" /> Restore
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button className="gap-2" onClick={() => setShortlistOpen(true)} disabled={busy}>
                <Star className="h-4 w-4" />
                {application.status === "shortlisted" ? "Reschedule" : "Shortlist"}
              </Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={busy}>
                Reject
              </Button>
            </div>
          )
        }
      />
      <BackendErrorAlert error={error} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {statusBadge(application.status)}
        {application.team ? <Badge variant="outline">{application.team}</Badge> : null}
        {application.interview_email_sent_at ? <Badge variant="outline">Invite sent</Badge> : null}
        {application.rejection_email_sent_at ? <Badge variant="outline">Rejection emailed</Badge> : null}
      </div>

      {application.status === "shortlisted" && application.interview_at ? (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Interview</p>
          <p className="mt-1 text-sm font-medium">
            {formatInterviewIst(application.interview_at, application.interview_duration_min)}
          </p>
          {application.interview_meet_url ? (
            <a
              href={application.interview_meet_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Video className="h-3.5 w-3.5" />
              {application.interview_meet_url}
            </a>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No Meet link yet — connect Google Calendar and reschedule.</p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <GradientAvatar name={application.name} size="lg" />
            <div>
              <p className="font-semibold">{application.name}</p>
              <p className="text-sm text-muted-foreground">{application.role_title}</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email">
              <a className="inline-flex items-center gap-1.5 text-primary hover:underline" href={`mailto:${application.email}`}>
                <Mail className="h-3.5 w-3.5" />
                {application.email}
              </a>
            </Field>
            <Field label="Phone">
              {application.phone ? (
                <a className="inline-flex items-center gap-1.5 text-primary hover:underline" href={`tel:${application.phone}`}>
                  <Phone className="h-3.5 w-3.5" />
                  {application.phone}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="LinkedIn / portfolio">
              {application.linkedin ? (
                <a
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  href={application.linkedin}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {application.linkedin}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="CV file">
              {application.resume_filename} · {formatFileSize(application.resume_size_bytes)}
            </Field>
          </div>
          <Field label="Cover note">{application.message || "—"}</Field>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">CV preview</h2>
            {resumeUrl && !resumeError ? (
              <a href={resumeUrl} download={application.resume_filename}>
                <Button size="sm" variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Download
                </Button>
              </a>
            ) : null}
          </div>
          {resumeError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {resumeError}
            </p>
          ) : !resumeUrl ? (
            <p className="text-sm text-muted-foreground">Loading CV…</p>
          ) : isImage ? (
            <img
              src={resumeUrl}
              alt={`${application.name} CV`}
              className="max-h-[80vh] w-full rounded-lg border border-border object-contain bg-stone-50"
            />
          ) : isPdf ? (
            <iframe
              title="CV"
              src={resumeUrl}
              className="h-[80vh] w-full rounded-lg border border-border bg-white"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Preview is not available. Download the file to review it.</p>
          )}
        </div>
      </div>

      <CareersShortlistDialog
        open={shortlistOpen}
        onOpenChange={setShortlistOpen}
        application={application}
        setup={setupQuery.data}
        loading={shortlist.isPending}
        onSubmit={(payload) => shortlist.mutate(payload)}
      />
      <CareersRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        application={application}
        emailConfigured={setupQuery.data?.email_configured}
        loading={reject.isPending}
        onSubmit={(payload) => reject.mutate(payload)}
      />
    </div>
  );
}
