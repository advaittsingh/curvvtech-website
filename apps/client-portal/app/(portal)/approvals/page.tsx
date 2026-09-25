"use client";

import { useEffect, useState } from "react";
import { Check, X, MessageSquare, CheckSquare, Eye, ChevronRight, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import {
  Card,
  PageHeader,
  Badge,
  Empty,
  Btn,
  Skeleton,
  relativeTime,
  Breadcrumbs,
  Avatar,
  cn,
} from "@/components/ui";

type Approval = {
  id: string;
  title: string;
  description: string | null;
  review_url: string | null;
  status: string;
  entity_type: string;
  created_at: string;
  comment?: string | null;
  decided_at?: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  design: "Design review",
  frontend: "Site / frontend update",
  change: "Changes made",
  milestone: "Milestone",
  file: "Document",
  change_order: "Change order",
  revision: "Revision",
  scope: "Scope update",
  deliverable: "Deliverable",
  invoice: "Invoice",
  other: "Approval",
};

function typeLabel(t: string) {
  return TYPE_LABELS[t] ?? t.replace(/_/g, " ");
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Approval | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function reload() {
    api<{ approvals: Approval[] }>("/approvals")
      .then((r) => {
        setItems(r.approvals);
        if (selected) {
          const updated = r.approvals.find((a) => a.id === selected.id);
          if (updated) setSelected(updated);
        }
      })
      .finally(() => setLoading(false));
  }
  useEffect(reload, []);

  async function decide(id: string, decision: "approved" | "rejected", c?: string) {
    setBusy(id);
    try {
      await api(`/approvals/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision, comment: c ?? "" }),
      });
      setComment("");
      reload();
      if (decision === "approved" || decision === "rejected") setSelected(null);
    } finally {
      setBusy(null);
    }
  }

  const pending = items.filter((a) => a.status === "pending");
  const decided = items.filter((a) => a.status !== "pending");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="cp-animate">
      <Breadcrumbs items={[{ label: "Approvals" }]} />
      <PageHeader
        title="Approvals"
        subtitle="Review designs and deliverables — approve, reject, or request changes."
        action={pending.length > 0 ? <span className="text-xs font-semibold rounded-full bg-[var(--brand)] text-white px-2.5 py-1">{pending.length} pending</span> : null}
      />

      {items.length === 0 ? (
        <Empty
          title="Nothing waiting on you"
          hint="When your team shares a design, prototype, or deliverable for review, it'll appear here with preview and approve/reject actions — like Figma comments."
          icon={CheckSquare}
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {pending.length > 0 && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Needs approval</h2>
                {pending.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelected(a)}
                    className={cn(
                      "w-full text-left rounded-2xl border p-4 transition",
                      selected?.id === a.id ? "border-[var(--brand)] bg-[var(--info-bg)]/30 shadow-sm" : "border-[var(--border)] bg-[var(--panel)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-[var(--warn)] font-semibold uppercase">Needs approval</div>
                        <div className="font-semibold mt-1">{a.title}</div>
                        <div className="text-xs text-[var(--muted)] mt-1">{typeLabel(a.entity_type)} · {relativeTime(a.created_at)}</div>
                      </div>
                      <ChevronRight size={16} className="text-[var(--muted)] shrink-0 mt-1" />
                    </div>
                    <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <Btn size="sm" onClick={() => decide(a.id, "approved")} disabled={busy === a.id}><Check size={14} /> Approve</Btn>
                      <Btn size="sm" variant="outline" onClick={() => setSelected(a)} disabled={busy === a.id}><MessageSquare size={14} /> Comment</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => decide(a.id, "rejected")} disabled={busy === a.id} className="text-[var(--danger)]"><X size={14} /> Reject</Btn>
                    </div>
                  </button>
                ))}
              </>
            )}

            {decided.length > 0 && (
              <div className="space-y-2 pt-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Audit trail</h2>
                {decided.map((a) => (
                  <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.title}</div>
                      {a.comment && <div className="text-sm text-[var(--muted)] italic truncate">&ldquo;{a.comment}&rdquo;</div>}
                    </div>
                    <Badge status={a.status} />
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            {selected ? (
              <Card className="p-0 overflow-hidden sticky top-20">
                <div className="p-5 border-b border-[var(--border)] bg-[var(--panel-2)]">
                  <div className="text-xs uppercase text-[var(--muted)]">{typeLabel(selected.entity_type)}</div>
                  <h3 className="text-xl font-bold mt-1">{selected.title}</h3>
                  <div className="text-xs text-[var(--muted)] mt-1">Requested {relativeTime(selected.created_at)}</div>
                </div>

                <div className="p-5 border-b border-[var(--border)] min-h-[160px] flex flex-col items-center justify-center bg-black/[0.02] gap-3">
                  {selected.review_url ? (
                    <>
                      <a
                        href={selected.review_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                      >
                        <ExternalLink size={16} /> Open preview
                      </a>
                      <p className="text-xs text-[var(--muted)] max-w-xs text-center break-all">{selected.review_url}</p>
                      {selected.description && <p className="text-sm text-[var(--muted)] max-w-sm text-center">{selected.description}</p>}
                    </>
                  ) : (
                    <div className="text-center text-[var(--muted)]">
                      <Eye size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">Preview</p>
                      {selected.description && <p className="text-xs mt-2 max-w-xs">{selected.description}</p>}
                    </div>
                  )}
                </div>

                <div className="p-5 border-b border-[var(--border)]">
                  <div className="text-xs font-semibold uppercase text-[var(--muted)] mb-3">Comments</div>
                  <div className="flex gap-2 mb-3">
                    <Avatar name="You" size={28} />
                    <div className="flex-1 rounded-xl bg-black/[0.04] px-3 py-2 text-sm text-[var(--muted)]">
                      {selected.comment || "No comments yet. Add yours below."}
                    </div>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Looks great. Need larger CTA button…"
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-accent)] resize-none"
                  />
                </div>

                <div className="p-5 flex flex-wrap gap-2">
                  <Btn onClick={() => decide(selected.id, "approved", comment)} disabled={busy === selected.id} className="flex-1">
                    <Check size={15} /> Approve
                  </Btn>
                  <Btn variant="outline" onClick={() => decide(selected.id, "rejected", comment)} disabled={busy === selected.id} className="flex-1 text-[var(--danger)]">
                    <X size={15} /> Reject
                  </Btn>
                  <Btn variant="soft" onClick={() => decide(selected.id, "rejected", comment || "Requesting changes")} disabled={busy === selected.id} className="w-full">
                    Request changes
                  </Btn>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-[var(--muted)] sticky top-20">
                <Eye size={28} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select an approval to preview and decide</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
