import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSignature,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { InboundOpportunity, SalesStage, ScoreTier5 } from "../demo-schemas";
import {
  INBOUND_SOURCE_LABEL,
  SALES_STAGE_COLORS,
  SALES_STAGE_LABELS,
  SALES_STAGES,
  SCORE_TIER5_CLASS,
  SCORE_TIER5_DOT,
  SCORE_TIER5_LABEL,
  resolveIntel,
  score100FromDemo,
  scoreTier5,
} from "../demo-schemas";
import { formatInr, formatRelativeTime } from "../constants";
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
  const tier = scoreTier5(score100);
  const closeProb = row.close_probability ?? intel.close_probability ?? null;
  const source = row.inbound_source ?? "demo_booking";
  const SourceIcon = sourceIcon(source);
  const subtitle = row.company ?? intel.business_type ?? null;
  const industry = intel.industry ?? (row.company ? intel.business_type ?? null : null);
  const value = row.deal_value_cents ? formatInr(row.deal_value_cents) : intel.potential_value_label ?? "₹80K – ₹1.2L";

  return (
    <Collapsible open={expanded} onOpenChange={() => onToggle()}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-start gap-3.5 p-4 text-left hover:bg-muted/40 transition-colors"
          >
            <Avatar name={row.name} tier={tier} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">{row.name}</span>
                <Badge variant="outline" className={SALES_STAGE_COLORS[stageKey] ?? ""}>
                  {SALES_STAGE_LABELS[stageKey] ?? stageKey}
                </Badge>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <SourceIcon className="h-3 w-3" />
                  {INBOUND_SOURCE_LABEL[source] ?? "Website"}
                </span>
              </div>

              {subtitle && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {subtitle}
                  {industry && industry !== subtitle && <span className="text-muted-foreground/70"> · {industry}</span>}
                </p>
              )}

              <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5 text-[11px] text-muted-foreground">
                {row.phone && (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                    <Phone className="h-3 w-3" /> {row.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {row.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatRelativeTime(row.created_at)}
                </span>
                {(intel.project_type || row.project_type) && (
                  <span className="truncate max-w-[220px]">{row.project_type ?? intel.project_type}</span>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-5 text-sm shrink-0 pl-2">
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Value</p>
                <p className="font-semibold">{value}</p>
              </div>
              {closeProb != null && (
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Close</p>
                  <p className="font-semibold">{closeProb}%</p>
                </div>
              )}
              <ScorePill score={score100} tier={tier} />
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 shrink-0 mt-1" />}
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
                      <a href={`mailto:${row.email}?subject=${encodeURIComponent("Curvvtech — follow up")}&body=${encodeURIComponent(followUpDraft.replace(/^Subject:.*\n?/i, ""))}`}>
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

const AVATAR_RING: Record<ScoreTier5, string> = {
  hot: "bg-emerald-100 text-emerald-700",
  high: "bg-green-100 text-green-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-orange-100 text-orange-700",
  low: "bg-stone-100 text-stone-600",
};

function Avatar({ name, tier }: { name: string; tier: ScoreTier5 }) {
  return (
    <div
      className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${AVATAR_RING[tier]}`}
      title={name}
    >
      {initialsOf(name)}
    </div>
  );
}

function ScorePill({ score, tier }: { score: number; tier: ScoreTier5 }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${SCORE_TIER5_CLASS[tier]}`}
      title={`Lead score ${score}/100`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${SCORE_TIER5_DOT[tier]}`} />
      {score} {SCORE_TIER5_LABEL[tier]}
    </div>
  );
}

function sourceIcon(source: string): LucideIcon {
  switch (source) {
    case "whatsapp":
      return MessageCircle;
    case "email":
    case "contact":
      return Mail;
    case "phone":
    case "referral":
      return Phone;
    case "linkedin":
      return Linkedin;
    case "instagram":
      return Instagram;
    default:
      return Globe;
  }
}
