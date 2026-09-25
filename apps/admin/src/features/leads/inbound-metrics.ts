import type { InboundOpportunity, SalesStage } from "./demo-schemas";
import { SALES_STAGES, score100FromDemo } from "./demo-schemas";

function stageOf(row: InboundOpportunity): SalesStage {
  const s = (row.sales_stage ?? row.display_status ?? "new") as SalesStage;
  return SALES_STAGES.includes(s) ? s : "new";
}

function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function ageDays(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function dealCents(row: InboundOpportunity): number {
  return Number(row.deal_value_cents ?? 0);
}

function closeProb(row: InboundOpportunity): number {
  return Number(row.close_probability ?? row.ai_intelligence?.close_probability ?? 25);
}

export type InboundMetrics = {
  inboundToday: number;
  qualified: number;
  expectedRevenueCents: number;
  pipelineValueCents: number;
  avgScore: number;
  conversionRate: number;
  meetingsToday: number;
  total: number;
};

export function deriveInboundMetrics(list: InboundOpportunity[]): InboundMetrics {
  const open = list.filter((r) => !["won", "lost"].includes(stageOf(r)));
  const qualified = list.filter((r) => ["qualified", "discovery_scheduled"].includes(stageOf(r))).length;
  const inboundToday = list.filter((r) => isToday(r.created_at)).length;
  const meetingsToday = list.filter((r) => isToday(r.date) && Boolean(r.time)).length;
  const converted = list.filter((r) => Boolean(r.converted_lead_id) || stageOf(r) === "won").length;

  const pipelineValueCents = open.reduce((s, r) => s + dealCents(r), 0);
  const expectedRevenueCents = open.reduce((s, r) => s + Math.round(dealCents(r) * (closeProb(r) / 100)), 0);

  const scored = list.filter((r) => r.lead_score != null || r.ai_intelligence?.score_100 != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, r) => s + score100FromDemo(r), 0) / scored.length)
    : 0;

  const conversionRate = list.length ? Math.round((converted / list.length) * 100) : 0;

  return {
    inboundToday,
    qualified,
    expectedRevenueCents,
    pipelineValueCents,
    avgScore,
    conversionRate,
    meetingsToday,
    total: list.length,
  };
}

export type PriorityTone = "hot" | "meeting" | "warn" | "money";

export type PriorityItem = {
  tone: PriorityTone;
  title: string;
  detail?: string;
  stage?: SalesStage | "all";
};

/** Actionable "needs attention" items derived from the current list. */
export function derivePriorityItems(list: InboundOpportunity[]): PriorityItem[] {
  const items: PriorityItem[] = [];

  const hot = list.filter(
    (r) => score100FromDemo(r) >= 75 && !r.converted_lead_id && ["new", "qualified"].includes(stageOf(r)),
  );
  if (hot.length) {
    items.push({
      tone: "hot",
      title: `${hot.length} hot lead${hot.length > 1 ? "s" : ""} need follow-up`,
      detail: "High score, not yet qualified",
    });
  }

  const meetings = list.filter((r) => isToday(r.date) && Boolean(r.time));
  if (meetings.length) {
    items.push({
      tone: "meeting",
      title: `${meetings.length} demo call${meetings.length > 1 ? "s" : ""} today`,
      detail: "Scheduled discovery sessions",
    });
  }

  const staleProposals = list.filter((r) => stageOf(r) === "proposal_sent" && ageDays(r.updated_at) >= 3);
  if (staleProposals.length) {
    items.push({
      tone: "warn",
      title: `${staleProposals.length} proposal${staleProposals.length > 1 ? "s" : ""} awaiting response`,
      detail: "No movement in 3+ days",
      stage: "proposal_sent",
    });
  }

  const untouched = list.filter((r) => stageOf(r) === "new" && ageDays(r.created_at) >= 2 && !r.converted_lead_id);
  const atRiskCents = untouched.reduce((s, r) => s + dealCents(r), 0);
  if (untouched.length) {
    items.push({
      tone: "money",
      title: `${untouched.length} new enquir${untouched.length > 1 ? "ies" : "y"} need first contact`,
      detail: atRiskCents > 0 ? "Pipeline waiting to be worked" : undefined,
      stage: "new",
    });
  }

  return items;
}

export type StageCount = { stage: SalesStage | "all"; count: number; valueCents: number };

export function deriveStageCounts(list: InboundOpportunity[]): StageCount[] {
  const counts: StageCount[] = [{ stage: "all", count: list.length, valueCents: 0 }];
  for (const stage of SALES_STAGES) {
    const rows = list.filter((r) => stageOf(r) === stage);
    counts.push({ stage, count: rows.length, valueCents: rows.reduce((s, r) => s + dealCents(r), 0) });
  }
  return counts;
}

export { stageOf };
