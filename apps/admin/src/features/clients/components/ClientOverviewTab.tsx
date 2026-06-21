import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Client, ClientProject } from "../schemas";
import {
  formatInr,
  formatOwnerDisplay,
  formatRelativeDays,
  formatShortDate,
  PORTAL_URL,
  PROJECT_STATUS_LABELS,
} from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

type Props = {
  client: Client;
  projects: ClientProject[];
  meetingCount: number;
  members: { user_id: string; email: string }[];
  onPatch: (body: object) => void;
  onResendPortalInvite: () => void;
};

export function ClientOverviewTab({ client, projects, meetingCount, members, onPatch, onResendPortalInvite }: Props) {
  const active = projects.filter((p) => !["completed", "cancelled"].includes(String(p.status ?? "")));

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Section title="Contact information">
        <Field label="Name"><Input defaultValue={client.name ?? ""} onBlur={(e) => onPatch({ name: e.target.value })} /></Field>
        <Field label="Email"><Input defaultValue={client.email ?? ""} onBlur={(e) => onPatch({ email: e.target.value })} /></Field>
        <Field label="Phone"><Input defaultValue={client.phone ?? ""} onBlur={(e) => onPatch({ phone: e.target.value })} placeholder="+91…" /></Field>
        <Field label="Company"><Input defaultValue={client.company ?? ""} onBlur={(e) => onPatch({ company: e.target.value })} /></Field>
      </Section>

      <Section title="Business information">
        <Field label="Industry"><Input defaultValue={client.industry ?? ""} onBlur={(e) => onPatch({ industry: e.target.value })} /></Field>
        <Field label="Website"><Input defaultValue={client.website ?? ""} onBlur={(e) => onPatch({ website: e.target.value })} placeholder="https://…" /></Field>
        <Field label="GST number"><Input defaultValue={client.gst_number ?? ""} onBlur={(e) => onPatch({ gst_number: e.target.value })} /></Field>
        <Field label="Address"><Input defaultValue={client.address ?? ""} onBlur={(e) => onPatch({ address: e.target.value })} /></Field>
      </Section>

      <Section title="Relationship">
        <ReadRow label="Client since" value={formatShortDate(client.createdAt)} />
        <Field label="Account manager">
          <Select value={client.account_manager_id ?? ""} onValueChange={(v) => onPatch({ account_manager_id: v || null })}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <ReadRow label="Source lead">
          {client.source_lead_id ? (
            <Link to={`/leads/${client.source_lead_id}`} className="text-primary hover:underline">
              {client.source_lead_name ?? "View lead"}
            </Link>
          ) : "—"}
        </ReadRow>
        <ReadRow label="Total meetings" value={String(meetingCount)} />
        <ReadRow label="Last contact" value={formatRelativeDays(client.updatedAt)} />
      </Section>

      <Section title="Portal access">
        <ReadRow label="Portal status" value={portalLabel(client.portal_status)} />
        <ReadRow label="Last login" value={client.portal_last_login_at ? formatRelativeDays(client.portal_last_login_at) : "Never"} />
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" asChild>
            <a href={PORTAL_URL} target="_blank" rel="noreferrer">Open portal</a>
          </Button>
          <Button size="sm" variant="ghost" onClick={onResendPortalInvite}>Resend invite</Button>
        </div>
      </Section>

      <Section title="Current engagements" className="lg:col-span-2">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active projects — create one to start delivery.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {active.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {PROJECT_STATUS_LABELS[String(p.status ?? "")] ?? p.status ?? "Active"}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold">{formatInr(p.budget_cents)}</span>
                </div>
                <Progress value={p.progress_pct ?? 0} className="h-1.5" />
                <Button size="sm" variant="link" className="px-0 h-auto" asChild>
                  <Link to={`/projects/${p.id}`}>View project</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function portalLabel(status?: string | null) {
  if (status === "invited") return "Invited";
  if (status === "active") return "Active";
  return "Not invited";
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 space-y-3 ${className ?? ""}`}>
      <h3 className="font-medium">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ReadRow({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm py-1 border-b border-border/60 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{children ?? value}</span>
    </div>
  );
}
