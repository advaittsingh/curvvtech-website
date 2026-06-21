import type { ReactNode } from "react";
import {
  PROPOSAL_STATUSES,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_COLORS,
  formatCompactInr,
  formatInr,
  formatShortDate,
  formatOwnerDisplay,
  type ProposalStatus,
} from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Proposal = {
  id: string;
  title: string;
  client_name?: string | null;
  status: string;
  total_cents?: number;
  createdAt?: string;
  owner_email?: string | null;
  share_token?: string;
};

type Props = {
  proposal: Proposal;
  computedTotalCents?: number;
  viewMode?: "edit" | "preview";
  onViewModeChange?: (mode: "edit" | "preview") => void;
  onStatusChange: (status: string) => void;
  onAiOpen: () => void;
  aiGenerating?: boolean;
  onPreview: () => void;
  onShare: () => void;
  onPdf: () => void;
  onDuplicate: () => void;
  onConvert: () => void;
  actionLoading?: string;
};

export function ProposalCommandHeader({
  proposal,
  computedTotalCents,
  viewMode = "edit",
  onViewModeChange,
  onStatusChange,
  onAiOpen,
  aiGenerating,
  onPreview,
  onShare,
  onPdf,
  onDuplicate,
  onConvert,
  actionLoading,
}: Props) {
  const st = (proposal.status in PROPOSAL_STATUS_LABELS ? proposal.status : "draft") as ProposalStatus;
  const value = computedTotalCents ?? proposal.total_cents;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5 lg:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight truncate">{proposal.title}</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <Meta label="Client" value={proposal.client_name ?? "—"} />
            <Meta label="Proposal value" value={formatInr(value)} highlight />
            <Meta label="Status">
              <Badge variant="outline" className={PROPOSAL_STATUS_COLORS[st]}>{PROPOSAL_STATUS_LABELS[st]}</Badge>
            </Meta>
            <Meta label="Created" value={formatShortDate(proposal.createdAt)} />
            <Meta label="Owner" value={formatOwnerDisplay(proposal.owner_email)} className="sm:col-span-2" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {onViewModeChange && (
            <div className="flex rounded-md border border-border overflow-hidden">
              <Button size="sm" variant={viewMode === "edit" ? "default" : "ghost"} className="rounded-none h-9" onClick={() => onViewModeChange("edit")}>Edit</Button>
              <Button size="sm" variant={viewMode === "preview" ? "default" : "ghost"} className="rounded-none h-9" onClick={() => onViewModeChange("preview")}>Preview</Button>
            </div>
          )}
          <Select value={proposal.status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROPOSAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{PROPOSAL_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <Button size="sm" onClick={onAiOpen} disabled={aiGenerating}>
          {aiGenerating ? "Generating…" : "AI generate"}
        </Button>
        <Button size="sm" variant="outline" onClick={onPreview}>Open client link</Button>
        <Button size="sm" variant="outline" onClick={onShare} disabled={actionLoading === "share"}>Share</Button>
        <Button size="sm" variant="outline" onClick={onPdf}>PDF</Button>
        <Button size="sm" variant="outline" onClick={onDuplicate} disabled={actionLoading === "duplicate"}>Duplicate</Button>
        {(proposal.status === "approved" || proposal.status === "converted") && (
          <Button size="sm" variant="default" onClick={onConvert} disabled={actionLoading === "convert" || proposal.status === "converted"}>
            Create project
          </Button>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value, children, highlight, className }: { label: string; value?: string; children?: ReactNode; highlight?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className={`mt-0.5 font-medium ${highlight ? "text-lg font-semibold" : ""}`}>{children ?? value}</div>
    </div>
  );
}

export function ProposalKpiBar({ summary }: { summary: { total?: number; drafts?: number; sent?: number; approved?: number; rejected?: number; proposal_value_cents?: number } | null }) {
  const s = summary ?? {};
  const items = [
    { label: "Total proposals", value: String(s.total ?? 0) },
    { label: "Drafts", value: String(s.drafts ?? 0) },
    { label: "Sent", value: String(s.sent ?? 0) },
    { label: "Approved", value: String(s.approved ?? 0) },
    { label: "Rejected", value: String(s.rejected ?? 0) },
    { label: "Proposal value", value: formatCompactInr(s.proposal_value_cents ?? 0), highlight: true },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
          <p className={`mt-1 font-semibold ${item.highlight ? "text-lg" : ""}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ProposalStatusPipeline({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {PROPOSAL_STATUSES.map((s) => (
        <Badge key={s} variant="outline" className={`${PROPOSAL_STATUS_COLORS[s]} gap-1.5`}>
          {PROPOSAL_STATUS_LABELS[s]}
          <span className="opacity-70">({counts[s] ?? 0})</span>
        </Badge>
      ))}
    </div>
  );
}
