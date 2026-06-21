import type { ProposalMetadata } from "../constants";
import { formatInr, newId, sumLineItems } from "../constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

type Section = { id: string; title: string; content: string; section_key?: string; block_type?: string };

export function ProposalSettingsPanel({
  clientName,
  leadName,
  projectType,
  computedTotalCents,
  currency,
  expectedClose,
  ownerId,
  members,
  onPatch,
}: {
  clientName?: string | null;
  leadName?: string | null;
  projectType?: string | null;
  computedTotalCents?: number;
  currency?: string | null;
  expectedClose?: string | null;
  ownerId?: string | null;
  members: { user_id: string; email: string }[];
  onPatch: (body: object) => void;
}) {
  return (
    <aside className="rounded-xl border border-border bg-card p-4 space-y-3 h-fit sticky top-6 min-w-0 overflow-hidden">
      <h3 className="font-medium text-sm">Proposal settings</h3>
      <Field label="Client">
        <Input defaultValue={clientName ?? ""} onBlur={(e) => onPatch({ client_name: e.target.value })} />
      </Field>
      {leadName && <ReadRow label="Lead" value={leadName} />}
      <Field label="Project type">
        <Input defaultValue={projectType ?? ""} onBlur={(e) => onPatch({ project_type: e.target.value })} />
      </Field>
      <Field label="Proposal value">
        <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/40 text-sm font-semibold">
          {formatInr(computedTotalCents ?? 0)}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Auto-calculated from pricing table</p>
      </Field>
      <Field label="Currency">
        <Input defaultValue={currency ?? "INR"} onBlur={(e) => onPatch({ currency: e.target.value })} />
      </Field>
      <Field label="Expected close">
        <Input type="date" defaultValue={expectedClose?.slice(0, 10) ?? ""} onBlur={(e) => onPatch({ expected_close_date: e.target.value || null })} />
      </Field>
      <Field label="Owner">
        <select
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue={ownerId ?? ""}
          onChange={(e) => onPatch({ owner_user_id: e.target.value || null })}
        >
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}
        </select>
      </Field>
    </aside>
  );
}

export function ProposalActivityPanel({
  events,
  analytics,
}: {
  events: { id: string; event_type: string; created_at?: string }[];
  analytics?: {
    view_count?: number;
    last_viewed_at?: string | null;
    sent_at?: string | null;
    approved_at?: string | null;
  } | null;
}) {
  const labels: Record<string, string> = {
    created: "Created",
    edited: "Edited",
    shared: "Shared",
    sent: "Sent",
    viewed: "Viewed",
    approved: "Approved",
    rejected: "Rejected",
    changes_requested: "Changes requested",
    converted: "Converted",
    negotiation: "Negotiation",
    invoices_generated: "Invoices generated",
    portal_activated: "Portal activated",
  };

  const stats = [
    { label: "Views", value: String(analytics?.view_count ?? 0) },
    {
      label: "Last opened",
      value: analytics?.last_viewed_at
        ? new Date(analytics.last_viewed_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—",
    },
    {
      label: "Shared",
      value: analytics?.sent_at
        ? new Date(analytics.sent_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : "—",
    },
    {
      label: "Approved",
      value: analytics?.approved_at
        ? new Date(analytics.approved_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : "—",
    },
  ];

  return (
    <aside className="rounded-xl border border-border bg-card p-4 space-y-3 min-w-0 overflow-hidden">
      <h3 className="font-medium text-sm">Analytics</h3>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="text-sm font-medium mt-0.5 truncate">{s.value}</p>
          </div>
        ))}
      </div>
      <h4 className="text-xs font-medium text-muted-foreground pt-1">Activity</h4>
      <ol className="space-y-2 text-sm max-h-48 overflow-y-auto">
        {events.length === 0 ? (
          <li className="text-muted-foreground text-xs">Activity will appear as you share and edit.</li>
        ) : (
          events.map((ev) => (
            <li key={ev.id} className="flex justify-between gap-2 text-xs">
              <span>{labels[ev.event_type] ?? ev.event_type}</span>
              {ev.created_at && (
                <span className="text-muted-foreground shrink-0">
                  {new Date(ev.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              )}
            </li>
          ))
        )}
      </ol>
    </aside>
  );
}

export function ProposalSectionBlock({
  section,
  metadata,
  onContentChange,
  onMetadataChange,
}: {
  section: Section;
  metadata: ProposalMetadata;
  onContentChange: (content: string) => void;
  onMetadataChange: (meta: ProposalMetadata) => void;
}) {
  const block = section.block_type ?? "text";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="font-medium">{section.title}</h3>

      {block === "pricing" && <PricingBlock metadata={metadata} onChange={onMetadataChange} />}
      {block === "timeline" && <TimelineBlock metadata={metadata} onChange={onMetadataChange} />}
      {block === "addons" && <AddonsBlock metadata={metadata} onChange={onMetadataChange} />}
      {block === "signature" && <SignatureBlock metadata={metadata} onChange={onMetadataChange} />}
      {block === "scope_modules" && <ScopeModulesBlock metadata={metadata} onChange={onMetadataChange} />}
      {block === "text" && (
        <Textarea
          value={section.content}
          rows={5}
          placeholder="Write section content…"
          onChange={(e) => onContentChange(e.target.value)}
        />
      )}
    </div>
  );
}

function PricingBlock({ metadata, onChange }: { metadata: ProposalMetadata; onChange: (m: ProposalMetadata) => void }) {
  const items = metadata.line_items ?? [];
  const total = sumLineItems(items);
  const milestones = metadata.payment_milestones ?? [];

  function updateItem(idx: number, patch: Partial<(typeof items)[0]>) {
    const next = [...items];
    next[idx] = { ...next[idx]!, ...patch };
    onChange({ ...metadata, line_items: next });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left py-2.5 px-3 font-medium">Description</th>
              <th className="py-2.5 px-2 font-medium w-16 text-center">Qty</th>
              <th className="py-2.5 px-3 font-medium w-32 text-right">Amount (₹)</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="py-1.5 px-2">
                  <Input value={item.description} className="border-0 shadow-none h-8" onChange={(e) => updateItem(idx, { description: e.target.value })} />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="number" value={item.qty} className="border-0 shadow-none h-8 text-center" onChange={(e) => updateItem(idx, { qty: Number(e.target.value) || 1 })} />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="number" value={item.amount_cents / 100} className="border-0 shadow-none h-8 text-right" onChange={(e) => updateItem(idx, { amount_cents: Math.round(Number(e.target.value) * 100) })} />
                </td>
                <td className="py-1.5 px-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onChange({ ...metadata, line_items: items.filter((_, i) => i !== idx) })}>×</Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/20">
              <td colSpan={2} className="py-2.5 px-3 text-right font-medium">Total</td>
              <td className="py-2.5 px-3 text-right font-semibold">{formatInr(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...metadata, line_items: [...items, { id: newId(), description: "New item", qty: 1, amount_cents: 0 }] })}>
        Add line item
      </Button>
      <div className="pt-2 border-t space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">Payment milestones</p>
        {milestones.map((m, idx) => (
          <div key={m.id} className="flex items-center gap-2 text-sm">
            <Input value={m.label} className="flex-1" onChange={(e) => {
              const next = [...milestones];
              next[idx] = { ...m, label: e.target.value };
              onChange({ ...metadata, payment_milestones: next });
            }} />
            <Input type="number" value={m.percent} className="w-16" onChange={(e) => {
              const next = [...milestones];
              next[idx] = { ...m, percent: Number(e.target.value) || 0 };
              onChange({ ...metadata, payment_milestones: next });
            }} />
            <span className="text-xs text-muted-foreground w-8">%</span>
            <Progress value={m.percent} className="w-16 h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineBlock({ metadata, onChange }: { metadata: ProposalMetadata; onChange: (m: ProposalMetadata) => void }) {
  const items = metadata.timeline_milestones ?? [];

  function updateRow(idx: number, patch: Partial<(typeof items)[0]>) {
    const next = [...items];
    next[idx] = { ...next[idx]!, ...patch };
    onChange({ ...metadata, timeline_milestones: next });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left py-2.5 px-3 font-medium">Milestone</th>
              <th className="py-2.5 px-2 font-medium w-36">Start date</th>
              <th className="py-2.5 px-2 font-medium w-36">End date</th>
              <th className="py-2.5 px-3 font-medium">Notes</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((m, idx) => (
              <tr key={m.id} className="border-b border-border/60">
                <td className="py-1.5 px-2">
                  <Input value={m.title} className="border-0 shadow-none h-8" onChange={(e) => updateRow(idx, { title: e.target.value })} />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="date" value={m.start_date ?? ""} className="border-0 shadow-none h-8" onChange={(e) => updateRow(idx, { start_date: e.target.value })} />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="date" value={m.end_date ?? ""} className="border-0 shadow-none h-8" onChange={(e) => updateRow(idx, { end_date: e.target.value })} />
                </td>
                <td className="py-1.5 px-2">
                  <Input value={m.description ?? ""} placeholder="Deliverables…" className="border-0 shadow-none h-8" onChange={(e) => updateRow(idx, { description: e.target.value })} />
                </td>
                <td className="py-1.5 px-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange({ ...metadata, timeline_milestones: items.filter((_, i) => i !== idx) })}>×</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...metadata, timeline_milestones: [...items, { id: newId(), title: "New milestone", start_date: "", end_date: "", description: "" }] })}>
        Add milestone
      </Button>
    </div>
  );
}

function AddonsBlock({ metadata, onChange }: { metadata: ProposalMetadata; onChange: (m: ProposalMetadata) => void }) {
  const items = metadata.addons ?? [];
  return (
    <div className="space-y-2">
      {items.map((a, idx) => (
        <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
          <Input value={a.name} className="flex-1" onChange={(e) => {
            const next = [...items];
            next[idx] = { ...a, name: e.target.value };
            onChange({ ...metadata, addons: next });
          }} />
          <Input type="number" value={a.amount_cents / 100} className="w-24" onChange={(e) => {
            const next = [...items];
            next[idx] = { ...a, amount_cents: Math.round(Number(e.target.value) * 100) };
            onChange({ ...metadata, addons: next });
          }} />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...metadata, addons: items.filter((_, i) => i !== idx) })}>×</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...metadata, addons: [...items, { id: newId(), name: "New add-on", amount_cents: 0 }] })}>
        Add add-on
      </Button>
    </div>
  );
}

function ScopeModulesBlock({ metadata, onChange }: { metadata: ProposalMetadata; onChange: (m: ProposalMetadata) => void }) {
  const groups = metadata.scope_modules?.groups ?? [];

  function updateGroup(gIdx: number, patch: Partial<(typeof groups)[0]>) {
    const next = [...groups];
    next[gIdx] = { ...next[gIdx]!, ...patch };
    onChange({ ...metadata, scope_modules: { groups: next } });
  }

  function updateItem(gIdx: number, iIdx: number, value: string) {
    const next = [...groups];
    const items = [...(next[gIdx]?.items ?? [])];
    items[iIdx] = value;
    next[gIdx] = { ...next[gIdx]!, items };
    onChange({ ...metadata, scope_modules: { groups: next } });
  }

  return (
    <div className="space-y-4">
      {groups.map((g, gIdx) => (
        <div key={gIdx} className="rounded-lg border border-border p-4 space-y-2">
          <Input value={g.title} className="font-medium" placeholder="Module group (e.g. Website)" onChange={(e) => updateGroup(gIdx, { title: e.target.value })} />
          <ul className="space-y-1.5">
            {g.items.map((item, iIdx) => (
              <li key={iIdx} className="flex gap-2">
                <Input value={item} className="text-sm" onChange={(e) => updateItem(gIdx, iIdx, e.target.value)} />
                <Button type="button" variant="ghost" size="sm" onClick={() => {
                  const items = g.items.filter((_, i) => i !== iIdx);
                  updateGroup(gIdx, { items });
                }}>×</Button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="sm" onClick={() => updateGroup(gIdx, { items: [...g.items, "New module"] })}>
            Add module
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({
        ...metadata,
        scope_modules: { groups: [...groups, { title: "New group", items: ["Module 1"] }] },
      })}>
        Add module group
      </Button>
    </div>
  );
}

export function BusinessAnalysisPanel({ analysis }: { analysis: ProposalMetadata["business_analysis"] }) {
  if (!analysis?.company) return null;
  const rows = [
    ["Industry", analysis.industry],
    ["Business model", analysis.business_model],
    ["Growth opportunity", analysis.growth_opportunity],
    ["Recommended", analysis.recommended_solution],
  ];
  return (
    <aside className="rounded-xl border border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-900 p-4 space-y-2">
      <h3 className="font-medium text-sm">Business analysis</h3>
      <p className="text-xs text-muted-foreground">{analysis.summary}</p>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([k, v]) => v ? (
          <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
        ) : null)}
      </dl>
    </aside>
  );
}

function SignatureBlock({ metadata, onChange }: { metadata: ProposalMetadata; onChange: (m: ProposalMetadata) => void }) {
  const sig = metadata.signature ?? {};
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">CurvvTech signature</p>
        <div className="border-b border-border h-10" />
        <p className="text-sm font-medium">Authorized signatory</p>
        <p className="text-xs text-muted-foreground">Date: _______________</p>
      </div>
      <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Client signature</p>
        <div className="border-b border-border h-10" />
        <Field label="Name">
          <Input value={sig.client_name ?? ""} placeholder="Client name" onChange={(e) => onChange({ ...metadata, signature: { ...sig, client_name: e.target.value } })} />
        </Field>
        <Field label="Designation">
          <Input value={sig.designation ?? ""} placeholder="Title / role" onChange={(e) => onChange({ ...metadata, signature: { ...sig, designation: e.target.value } })} />
        </Field>
        <p className="text-xs text-muted-foreground">Client signs online when approving the shared link.</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>;
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm py-1"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
