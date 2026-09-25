import { Calendar, FileSignature, UserPlus, FolderKanban, Trash2 } from "lucide-react";
import type { Lead, LeadAiInsights } from "../schemas";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  formatInr,
  formatOwnerDisplay,
  scoreTier,
  scoreTierColor,
  scoreTierLabel,
} from "../constants";
import {
  computeDealHealth,
  lastReplyLabel,
  renderStars,
  sourceLabel,
} from "../lead.utils";
import { GradientAvatar } from "@/components/crm/GradientAvatar";
import { AskAiButton } from "@/components/crm/AskAiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  lead: Lead;
  score: number;
  ownerEmail: string | null;
  aiInsights?: LeadAiInsights | null;
  actionLoading: string;
  onGenerateProposal: () => void;
  onCreateClient: () => void;
  onCreateProject: () => void;
  onScheduleCall: () => void;
  onOpenAi: () => void;
  onDelete?: () => void;
};

function CompanyMark({ company }: { company: string }) {
  const letter = company.charAt(0).toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-bold">
      {letter}
    </div>
  );
}

export function LeadDealHeader({
  lead,
  score,
  ownerEmail,
  aiInsights,
  actionLoading,
  onGenerateProposal,
  onCreateClient,
  onCreateProject,
  onScheduleCall,
  onOpenAi,
  onDelete,
}: Props) {
  const st = String(lead.status ?? "new") as keyof typeof LEAD_STATUS_LABELS;
  const ownerName = formatOwnerDisplay(ownerEmail);
  const health = computeDealHealth(lead, score, aiInsights);
  const displayName = lead.name ?? "Unnamed lead";
  const company = lead.company ?? "No company";
  const tier = scoreTier(score);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 lg:p-6 space-y-4">
        <div className="flex gap-4 min-w-0">
          <GradientAvatar name={displayName} size="lg" className="hidden sm:flex" />
          <GradientAvatar name={displayName} size="md" className="sm:hidden" />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight truncate">{displayName}</h1>
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <CompanyMark company={company} />
              <span className="text-sm sm:text-base truncate">{company}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={LEAD_STATUS_COLORS[st]}>
                {LEAD_STATUS_LABELS[st]}
              </Badge>
              <Badge variant="outline" className={scoreTierColor(tier)}>
                {scoreTierLabel(tier)} · {health.healthPct}%
              </Badge>
              <span className="text-amber-500 text-sm">{renderStars(health.stars)}</span>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 border-t border-border pt-4">
          <MetaItem label="Owner" value={ownerName} />
          <MetaItem label="Value" value={formatInr(lead.deal_value_cents)} />
          <MetaItem label="Last reply" value={lastReplyLabel(lead)} />
          <MetaItem label="Source" value={sourceLabel(lead)} />
        </dl>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" onClick={onGenerateProposal} disabled={actionLoading === "proposal"}>
            <FileSignature className="h-4 w-4 mr-1.5" />
            Generate proposal
          </Button>
          <Button size="sm" variant="outline" onClick={onCreateClient} disabled={actionLoading === "client"}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Create client
          </Button>
          <Button size="sm" variant="outline" onClick={onCreateProject} disabled={!lead.converted_client_id}>
            <FolderKanban className="h-4 w-4 mr-1.5" />
            Create project
          </Button>
          <Button size="sm" variant="outline" onClick={onScheduleCall}>
            <Calendar className="h-4 w-4 mr-1.5" />
            Schedule call
          </Button>
          <AskAiButton onOpenSummary={onOpenAi} />
          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 ml-auto"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm font-semibold truncate">{value}</dd>
    </div>
  );
}
