import { useState } from "react";
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
import {
  buildLeadMetaTags,
  buildRelationshipMilestones,
  buyingStageLabel,
  getLeadMeta,
} from "../lead.utils";
import { LeadScoreBreakdown } from "./LeadScoreBreakdown";
import { LeadFollowUpWidget } from "./LeadFollowUpWidget";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

type Props = {
  lead: Lead;
  score: number;
  members: { user_id: string; email: string }[];
  onPatch: (body: object) => void;
};

export function LeadOverviewTab({ lead, score, members, onPatch }: Props) {
  const st = String(lead.status ?? "new") as keyof typeof LEAD_STATUS_LABELS;
  const milestones = buildRelationshipMilestones(lead);

  function patchMeta(key: string, value: string) {
    onPatch({ tags: buildLeadMetaTags(lead, key, value) });
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Relationship timeline">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {milestones.map((m) => (
                <div
                  key={m.key}
                  className={cn(
                    "rounded-lg border p-3 text-center transition-shadow hover:shadow-md",
                    m.done ? "border-emerald-200 bg-emerald-50/50" : "border-border bg-muted/20",
                  )}
                >
                  {m.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  )}
                  <p className="text-xs font-medium">{m.label}</p>
                  {m.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{m.hint}</p>}
                </div>
              ))}
            </div>
          </Section>

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
              <Field label="Phone / WhatsApp">
                <Input defaultValue={lead.phone ?? ""} onBlur={(e) => onPatch({ phone: e.target.value })} />
              </Field>
              <Field label="Company">
                <Input defaultValue={lead.company ?? ""} onBlur={(e) => onPatch({ company: e.target.value })} />
              </Field>
              <Field label="LinkedIn">
                <Input
                  defaultValue={getLeadMeta(lead, "linkedin")}
                  placeholder="https://linkedin.com/in/…"
                  onBlur={(e) => patchMeta("linkedin", e.target.value)}
                />
              </Field>
              <Field label="Website">
                <Input
                  defaultValue={getLeadMeta(lead, "website")}
                  placeholder="https://…"
                  onBlur={(e) => patchMeta("website", e.target.value)}
                />
              </Field>
              <Field label="Timezone">
                <Input
                  defaultValue={getLeadMeta(lead, "timezone")}
                  placeholder="Asia/Kolkata"
                  onBlur={(e) => patchMeta("timezone", e.target.value)}
                />
              </Field>
              <Field label="Preferred contact">
                <Select
                  value={getLeadMeta(lead, "preferred_contact") || "email"}
                  onValueChange={(v) => patchMeta("preferred_contact", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </Section>
          </div>

          <Section title="Opportunity">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Service required">
                <Input
                  defaultValue={lead.project_type ?? ""}
                  onBlur={(e) => onPatch({ project_type: e.target.value })}
                  placeholder="Website development, Shopify store…"
                />
              </Field>
              <Field label="Buying stage">
                <Input
                  defaultValue={buyingStageLabel(lead)}
                  onBlur={(e) => patchMeta("buying_stage", e.target.value)}
                />
              </Field>
              <Field label="Expected close date">
                <Input
                  type="date"
                  defaultValue={lead.expected_close_date?.slice(0, 10) ?? ""}
                  onBlur={(e) => onPatch({ expected_close_date: e.target.value || null })}
                />
              </Field>
              <Field label="Expected go-live">
                <Input
                  defaultValue={getLeadMeta(lead, "go_live")}
                  placeholder="30 days from kickoff"
                  onBlur={(e) => patchMeta("go_live", e.target.value)}
                />
              </Field>
              <Field label="Budget">
                <Input defaultValue={lead.budget ?? ""} onBlur={(e) => onPatch({ budget: e.target.value })} placeholder="₹50,000" />
              </Field>
              <Field label="Timeline">
                <Input defaultValue={lead.timeline ?? ""} onBlur={(e) => onPatch({ timeline: e.target.value })} placeholder="30 days" />
              </Field>
              <Field label="Pain points">
                <Input
                  defaultValue={getLeadMeta(lead, "pain_points")}
                  onBlur={(e) => patchMeta("pain_points", e.target.value)}
                  placeholder="Slow site, no leads from ads…"
                />
              </Field>
              <Field label="Current solution">
                <Input
                  defaultValue={getLeadMeta(lead, "current_solution")}
                  onBlur={(e) => patchMeta("current_solution", e.target.value)}
                />
              </Field>
              <Field label="Competitors">
                <Input
                  defaultValue={getLeadMeta(lead, "competitors")}
                  onBlur={(e) => patchMeta("competitors", e.target.value)}
                  placeholder="Agency X, Agency Y"
                />
              </Field>
              <Field label="Decision maker">
                <Input
                  defaultValue={getLeadMeta(lead, "decision_maker") || lead.name || ""}
                  onBlur={(e) => patchMeta("decision_maker", e.target.value)}
                />
              </Field>
            </div>
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

        <aside className="space-y-4">
          <LeadScoreBreakdown lead={lead} score={score} />
          <LeadFollowUpWidget lead={lead} />
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow ${className ?? ""}`}>
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
