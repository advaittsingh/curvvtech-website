import {
  ExternalLink,
  FileDown,
  FolderKanban,
  Share2,
} from "lucide-react";
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
import { GradientAvatar } from "@/components/crm/GradientAvatar";
import { AskAiButton } from "@/components/crm/AskAiButton";
import { PipelineProgress } from "@/components/crm/PipelineProgress";
import { ProposalOverflowMenu } from "./ProposalOverflowMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";
import { Eye, FileSignature, Send, CheckCircle2, XCircle, Clock } from "lucide-react";

type Proposal = {
  id: string;
  title: string;
  client_name?: string | null;
  status: string;
  total_cents?: number;
  createdAt?: string;
  owner_email?: string | null;
  share_token?: string;
  project_type?: string | null;
  lead_id?: string | null;
  lead_name?: string | null;
  client_id?: string | null;
};

type Props = {
  proposal: Proposal;
  computedTotalCents?: number;
  viewMode?: "edit" | "preview";
  onViewModeChange?: (mode: "edit" | "preview") => void;
  onStatusChange: (status: string) => void;
  onAiOpen: () => void;
  onAiGenerate?: () => void;
  aiGenerating?: boolean;
  onPreview: () => void;
  onShare: () => void;
  onPdf: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConvert: () => void;
  actionLoading?: string;
};

const PIPELINE_STAGES = PROPOSAL_STATUSES.filter((s) => !["expired", "converted"].includes(s)).map((s) => ({
  id: s,
  label: PROPOSAL_STATUS_LABELS[s],
}));

export function ProposalCommandHeader({
  proposal,
  computedTotalCents,
  viewMode = "edit",
  onViewModeChange,
  onStatusChange,
  onAiOpen,
  onAiGenerate,
  aiGenerating,
  onPreview,
  onShare,
  onPdf,
  onDuplicate,
  onDelete,
  onConvert,
  actionLoading,
}: Props) {
  const st = (proposal.status in PROPOSAL_STATUS_LABELS ? proposal.status : "draft") as ProposalStatus;
  const value = computedTotalCents ?? proposal.total_cents;
  const displayName = proposal.client_name ?? proposal.title ?? "Proposal";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 lg:p-6 space-y-4">
        <div className="flex gap-4 min-w-0">
          <GradientAvatar name={displayName} size="lg" className="hidden sm:flex" />
          <GradientAvatar name={displayName} size="md" className="sm:hidden" />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight truncate">{proposal.title}</h1>
            <p className="text-muted-foreground text-sm sm:text-base truncate">
              {proposal.client_name ?? "No client"}
              {proposal.project_type ? ` · ${proposal.project_type}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={PROPOSAL_STATUS_COLORS[st]}>
                {PROPOSAL_STATUS_LABELS[st]}
              </Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                {formatInr(value)}
              </Badge>
            </div>
          </div>
          {onViewModeChange && (
            <div className="flex rounded-lg border border-border overflow-hidden shrink-0 h-fit">
              <Button size="sm" variant={viewMode === "edit" ? "default" : "ghost"} className="rounded-none h-9 px-4" onClick={() => onViewModeChange("edit")}>Edit</Button>
              <Button size="sm" variant={viewMode === "preview" ? "default" : "ghost"} className="rounded-none h-9 px-4" onClick={() => onViewModeChange("preview")}>Preview</Button>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 border-t border-border pt-4">
          <MetaItem label="Client" value={proposal.client_name ?? "—"} />
          <MetaItem label="Owner" value={formatOwnerDisplay(proposal.owner_email)} />
          <MetaItem label="Created" value={formatShortDate(proposal.createdAt)} />
          <MetaItem label="Value" value={formatInr(value)} highlight />
        </dl>

        <PipelineProgress
          stages={PIPELINE_STAGES}
          currentId={proposal.status}
          onStageChange={onStatusChange}
        />

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <AskAiButton
            onOpenSummary={onAiOpen}
            actions={[
              { label: "Generate full proposal", onClick: () => onAiGenerate?.() },
              { label: "Business analysis", onClick: onAiOpen },
              { label: "Regenerate pricing", onClick: onAiOpen },
            ]}
          />
          <Button size="sm" variant="outline" onClick={onPreview}>
            <ExternalLink className="h-4 w-4 mr-1.5" /> Client link
          </Button>
          <Button size="sm" variant="outline" onClick={onShare} disabled={actionLoading === "share"}>
            <Share2 className="h-4 w-4 mr-1.5" /> Share
          </Button>
          <Button size="sm" variant="outline" onClick={onPdf}>
            <FileDown className="h-4 w-4 mr-1.5" /> PDF
          </Button>
          {(proposal.status === "approved" || proposal.status === "converted") && (
            <Button size="sm" onClick={onConvert} disabled={actionLoading === "convert" || proposal.status === "converted"}>
              <FolderKanban className="h-4 w-4 mr-1.5" /> Create project
            </Button>
          )}
          <ProposalOverflowMenu
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            loading={actionLoading}
          />
          <Select value={proposal.status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROPOSAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{PROPOSAL_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className={`mt-1 truncate ${highlight ? "text-lg font-bold" : "text-sm font-semibold"}`}>{value}</dd>
    </div>
  );
}

type KpiItem = { label: string; value: string; icon: LucideIcon; iconClass: string; highlight?: boolean };

export function ProposalKpiBar({ summary }: { summary: { total?: number; drafts?: number; sent?: number; approved?: number; rejected?: number; proposal_value_cents?: number } | null }) {
  const s = summary ?? {};
  const items: KpiItem[] = [
    { label: "Total proposals", value: String(s.total ?? 0), icon: FileSignature, iconClass: "text-violet-600 bg-violet-50" },
    { label: "Drafts", value: String(s.drafts ?? 0), icon: Clock, iconClass: "text-stone-600 bg-stone-50" },
    { label: "Sent", value: String(s.sent ?? 0), icon: Send, iconClass: "text-blue-600 bg-blue-50" },
    { label: "Approved", value: String(s.approved ?? 0), icon: CheckCircle2, iconClass: "text-emerald-600 bg-emerald-50" },
    { label: "Rejected", value: String(s.rejected ?? 0), icon: XCircle, iconClass: "text-red-600 bg-red-50" },
    { label: "Pipeline value", value: formatCompactInr(s.proposal_value_cents ?? 0), icon: Eye, iconClass: "text-amber-600 bg-amber-50", highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4 min-w-0 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconClass}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{item.label}</p>
            <p className={`mt-1 truncate ${item.highlight ? "text-lg font-bold" : "text-base font-semibold"}`}>{item.value}</p>
          </div>
        );
      })}
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
