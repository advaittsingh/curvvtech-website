import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileSignature,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import type { InboundOpportunity, SalesStage } from "../demo-schemas";
import {
  SALES_STAGE_COLORS,
  SALES_STAGE_LABELS,
  SALES_STAGES,
  formatScore100,
  resolveIntel,
  score100FromDemo,
} from "../demo-schemas";
import { formatInr, scoreTier, scoreTierColor } from "../constants";
import { DemoIntelligencePanel } from "./DemoIntelligencePanel";
import { DemoActivityTimeline } from "./DemoActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Member = { user_id: string; email: string };

type Props = {
  row: InboundOpportunity;
  members: Member[];
  expanded: boolean;
  onToggle: () => void;
  analyzing?: boolean;
  actionLoading?: string;
  followUpDraft?: string;
  onAnalyze: () => void;
  onConfirm: () => void;
  onAssign: (userId: string) => void;
  onStageChange: (stage: SalesStage) => void;
  onCreateLead: () => void;
  onCreatePipeline: () => void;
  onCreateProposal: () => void;
  onGenerateFollowUp: () => void;
  onOpenAi: () => void;
  onScheduleCall: () => void;
};

export function DemoRequestCard({
  row,
  members,
  expanded,
  onToggle,
  analyzing,
  actionLoading,
  followUpDraft,
  onAnalyze,
  onConfirm,
  onAssign,
  onStageChange,
  onCreateLead,
  onCreatePipeline,
  onCreateProposal,
  onGenerateFollowUp,
  onOpenAi,
  onScheduleCall,
}: Props) {
  const [showFollowUp, setShowFollowUp] = useState(false);
  const stage = (row.sales_stage ?? row.display_status ?? "new") as SalesStage;
  const stageKey = SALES_STAGES.includes(stage) ? stage : "new";
  const intel = resolveIntel(row);
  const score100 = score100FromDemo(row);
  const tier = scoreTier(score100);

  return (
    <Collapsible open={expanded} onOpenChange={() => onToggle()}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">{row.name}</span>
                {row.company && <span className="text-muted-foreground text-sm truncate">· {row.company}</span>}
                <Badge variant="outline" className={SALES_STAGE_COLORS[stageKey] ?? ""}>
                  {SALES_STAGE_LABELS[stageKey] ?? stageKey}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{row.email}</p>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Value</p>
                <p className="font-medium">
                  {row.deal_value_cents ? formatInr(row.deal_value_cents) : intel.potential_value_label ?? "₹80K – ₹1.2L"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Score</p>
                <Badge variant="outline" className={scoreTierColor(tier)}>{formatScore100(row)}</Badge>
              </div>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-border pt-4">
            <div className="grid lg:grid-cols-[1fr_260px] gap-4">
              <div className="space-y-4 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={stageKey} onValueChange={(v) => onStageChange(v as SalesStage)}>
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue placeholder="Sales stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {SALES_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>{SALES_STAGE_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="secondary" onClick={onAnalyze} disabled={analyzing}>
                    {analyzing ? (
                      <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                    )}
                    {row.analyzed_at ? "Re-analyze" : "Analyze"}
                  </Button>
                </div>

                <DemoIntelligencePanel row={row} loading={analyzing} />

                <div className="grid md:grid-cols-2 gap-4">
                  <section className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h4>
                    <dl className="text-sm space-y-1.5">
                      <Row label="Name" value={row.name} />
                      <Row label="Email" value={row.email} />
                      <Row label="Phone" value={row.phone ?? "—"} />
                      <Row label="Company" value={row.company ?? intel.company ?? "—"} />
                      <Row label="Website" value={row.website ?? intel.website ?? "—"} />
                      <Row label="Demo slot" value={row.date && row.time ? `${row.date} · ${row.time}` : "—"} />
                    </dl>
                  </section>
                  <section className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requirements</h4>
                    <p className="text-sm">{row.requirements ?? row.message ?? intel.requirements_summary ?? "—"}</p>
                  </section>
                </div>

                <div className="flex flex-wrap gap-2">
                  {row.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={onConfirm}>Confirm demo</Button>
                  )}
                  {!row.converted_lead_id ? (
                    <>
                      <Button size="sm" onClick={onCreatePipeline} disabled={!!actionLoading}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Create opportunity
                      </Button>
                      <Button size="sm" variant="outline" onClick={onCreateLead} disabled={!!actionLoading}>Create lead</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/leads/${row.converted_lead_id}`}>View lead</Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={onCreateProposal} disabled={!!actionLoading}>
                    <FileSignature className="h-3.5 w-3.5 mr-1" /> Create proposal
                  </Button>
                  <Button size="sm" variant="outline" onClick={onScheduleCall}>
                    <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule call
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { onGenerateFollowUp(); setShowFollowUp(true); }}>
                    <Mail className="h-3.5 w-3.5 mr-1" /> Generate follow-up
                  </Button>
                  <Button size="sm" variant="outline" onClick={onOpenAi}>
                    <Bot className="h-3.5 w-3.5 mr-1" /> Ask AI
                  </Button>
                  {row.phone && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`tel:${row.phone}`}><Phone className="h-3.5 w-3.5 mr-1" /> Call</a>
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2 max-w-sm">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={row.assigned_user_id ?? ""} onValueChange={onAssign}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Assign team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {showFollowUp && followUpDraft && (
                  <div className="space-y-2">
                    <Textarea value={followUpDraft} readOnly rows={8} className="text-sm font-mono" />
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:${row.email}?subject=${encodeURIComponent("CurvvTech — follow up")}&body=${encodeURIComponent(followUpDraft.replace(/^Subject:.*\n?/i, ""))}`}>
                        Open in email
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              <DemoActivityTimeline demoId={row.id} enabled={expanded} />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground w-20 shrink-0">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}
