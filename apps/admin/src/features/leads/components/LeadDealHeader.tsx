import { Calendar, FileSignature, Sparkles, UserPlus, FolderKanban } from "lucide-react";
import type { ReactNode } from "react";
import type { Lead } from "../schemas";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  formatInr,
  formatOwnerDisplay,
  formatRelativeDays,
  formatShortDate,
  formatNextFollowUp,
  scoreTier,
  scoreTierColor,
} from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  lead: Lead;
  score: number;
  ownerEmail: string | null;
  actionLoading: string;
  onStatusChange: (status: string) => void;
  onGenerateProposal: () => void;
  onCreateClient: () => void;
  onCreateProject: () => void;
  onScheduleCall: () => void;
  onOpenAi: () => void;
};

export function LeadDealHeader({
  lead,
  score,
  ownerEmail,
  actionLoading,
  onStatusChange,
  onGenerateProposal,
  onCreateClient,
  onCreateProject,
  onScheduleCall,
  onOpenAi,
}: Props) {
  const st = String(lead.status ?? "new") as keyof typeof LEAD_STATUS_LABELS;
  const tier = scoreTier(score);
  const ownerName = formatOwnerDisplay(ownerEmail);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 lg:p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight truncate">
              {lead.name ?? "Unnamed lead"}
            </h1>
            <p className="text-muted-foreground text-base">{lead.company ?? "No company"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenAi}>
              <Sparkles className="h-4 w-4" />
              AI Assistant
            </Button>
            <Select value={String(lead.status ?? "new")} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-border">
          <MetaItem label="Deal value" value={formatInr(lead.deal_value_cents)} highlight />
          <MetaItem label="Status">
            <Badge variant="outline" className={LEAD_STATUS_COLORS[st]}>
              {LEAD_STATUS_LABELS[st]}
            </Badge>
          </MetaItem>
          <MetaItem label="Score">
            <span className="font-semibold">
              {score}/100{" "}
              <Badge variant="outline" className={`ml-1 ${scoreTierColor(tier)}`}>
                {tier}
              </Badge>
            </span>
          </MetaItem>
          <MetaItem label="Owner" value={ownerName} />
          <MetaItem label="Created" value={formatShortDate(lead.createdAt)} />
          <MetaItem label="Last contact" value={formatRelativeDays(lead.last_contacted_at ?? lead.updatedAt)} />
          <MetaItem label="Next follow-up" value={formatNextFollowUp(lead.next_follow_up_at)} className="sm:col-span-2 lg:col-span-1" />
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
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
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
  children,
  highlight,
  className,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className={`mt-1 text-sm ${highlight ? "text-lg font-semibold" : "font-medium"}`}>
        {children ?? value}
      </div>
    </div>
  );
}
