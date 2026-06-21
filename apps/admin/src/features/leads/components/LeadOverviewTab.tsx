import type { ReactNode } from "react";
import type { Lead } from "../schemas";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  formatInr,
} from "../constants";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  lead: Lead;
  members: { user_id: string; email: string }[];
  onPatch: (body: object) => void;
};

export function LeadOverviewTab({ lead, members, onPatch }: Props) {
  const st = String(lead.status ?? "new") as keyof typeof LEAD_STATUS_LABELS;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Section title="Deal information">
        <ReadRow label="Lead value" value={formatInr(lead.deal_value_cents)} />
        <ReadRow label="Probability" value={`${lead.probability ?? 0}%`} />
        <ReadRow label="Status">
          <Badge variant="outline" className={LEAD_STATUS_COLORS[st]}>
            {LEAD_STATUS_LABELS[st]}
          </Badge>
        </ReadRow>
        <Field label="Source">
          <Select value={lead.source ?? "manual"} onValueChange={(v) => onPatch({ source: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>{LEAD_SOURCE_LABELS[s] ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={lead.priority ?? "medium"} onValueChange={(v) => onPatch({ priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Deal value (₹)">
          <Input
            type="number"
            defaultValue={lead.deal_value_cents ? lead.deal_value_cents / 100 : ""}
            onBlur={(e) => onPatch({ deal_value_cents: Math.round(Number(e.target.value || 0) * 100) })}
          />
        </Field>
        <Field label="Assign to">
          <Select value={lead.assigned_to_clerk_id ?? ""} onValueChange={(v) => onPatch({ assigned_to_clerk_id: v || null })}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Contact information">
        <Field label="Name">
          <Input defaultValue={lead.name ?? ""} onBlur={(e) => onPatch({ name: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input defaultValue={lead.email ?? ""} onBlur={(e) => onPatch({ email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input defaultValue={lead.phone ?? ""} onBlur={(e) => onPatch({ phone: e.target.value })} />
        </Field>
        <Field label="Company">
          <Input defaultValue={lead.company ?? ""} onBlur={(e) => onPatch({ company: e.target.value })} />
        </Field>
      </Section>

      <Section title="Opportunity">
        <Field label="Service required">
          <Input
            defaultValue={lead.project_type ?? ""}
            onBlur={(e) => onPatch({ project_type: e.target.value })}
            placeholder="Website development, Shopify store…"
          />
        </Field>
        <Field label="Expected close date">
          <Input
            type="date"
            defaultValue={lead.expected_close_date?.slice(0, 10) ?? ""}
            onBlur={(e) => onPatch({ expected_close_date: e.target.value || null })}
          />
        </Field>
        <Field label="Budget">
          <Input defaultValue={lead.budget ?? ""} onBlur={(e) => onPatch({ budget: e.target.value })} placeholder="₹50,000" />
        </Field>
        <Field label="Timeline">
          <Input defaultValue={lead.timeline ?? ""} onBlur={(e) => onPatch({ timeline: e.target.value })} placeholder="30 days" />
        </Field>
      </Section>

      <Section title="Requirements" className="lg:col-span-2">
        <p className="text-xs text-muted-foreground mb-2">
          Capture scope, inspiration, and constraints — this feeds proposals and project handoff.
        </p>
        <Textarea
          defaultValue={lead.requirements ?? lead.message ?? ""}
          rows={6}
          placeholder="Client wants premium Shopify website. Inspired by Ridhimehra. Timeline 30 days."
          onBlur={(e) => onPatch({ requirements: e.target.value })}
        />
      </Section>
    </div>
  );
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
