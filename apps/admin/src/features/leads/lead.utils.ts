import type { Lead, LeadAiInsights } from "./schemas";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, scoreTier } from "./constants";

const META_PREFIX = "meta:";

export type ScoreFactor = { label: string; ok: boolean; partial?: boolean };

export type DealHealth = {
  healthPct: number;
  stars: number;
  probability: number;
  budgetMatchPct: number;
  engagement: "High" | "Medium" | "Low" | "Unknown";
  decisionMaker: "Confirmed" | "Likely" | "Not confirmed";
  risk: "Low" | "Medium" | "High";
  expectedCloseLabel: string;
  aiSummary: string;
  recommendedAction: string;
};

export function getLeadMeta(lead: Lead, key: string): string {
  const prefix = `${META_PREFIX}${key}:`;
  const tag = (lead.tags ?? []).find((t) => t.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : "";
}

export function buildLeadMetaTags(lead: Lead, key: string, value: string): string[] {
  const prefix = `${META_PREFIX}${key}:`;
  const rest = (lead.tags ?? []).filter((t) => !t.startsWith(prefix));
  if (value.trim()) rest.push(`${prefix}${value.trim()}`);
  return rest;
}

export function computeScoreBreakdown(lead: Lead): ScoreFactor[] {
  const hasBudget = Boolean(lead.budget?.trim() || (lead.deal_value_cents && lead.deal_value_cents > 0));
  const hasAuthority = Boolean(lead.email?.trim() && lead.phone?.trim());
  const hasTimeline = Boolean(lead.timeline?.trim() || lead.expected_close_date);
  const hasRequirements = Boolean(lead.requirements?.trim() || lead.message?.trim());
  const decisionMaker = Boolean(lead.name?.trim() || getLeadMeta(lead, "decision_maker"));

  return [
    { label: "Budget", ok: hasBudget },
    { label: "Authority", ok: hasAuthority, partial: Boolean(lead.email || lead.phone) && !hasAuthority },
    { label: "Timeline", ok: hasTimeline },
    { label: "Requirements", ok: hasRequirements },
    { label: "Decision maker", ok: decisionMaker },
  ];
}

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function engagementLevel(lead: Lead): DealHealth["engagement"] {
  const days = daysSince(lead.last_contacted_at ?? lead.updatedAt);
  if (days === null) return "Unknown";
  if (days <= 2) return "High";
  if (days <= 7) return "Medium";
  return "Low";
}

function budgetMatchPct(lead: Lead): number {
  const deal = lead.deal_value_cents ?? 0;
  if (!deal) return lead.budget ? 75 : 40;
  const budgetNum = Number(String(lead.budget ?? "").replace(/[^\d.]/g, ""));
  if (!budgetNum) return 85;
  const budgetCents = Math.round(budgetNum * 100);
  const ratio = deal / budgetCents;
  if (ratio >= 0.85 && ratio <= 1.15) return 95;
  if (ratio >= 0.7 && ratio <= 1.3) return 80;
  return 55;
}

function dealRisk(lead: Lead, engagement: DealHealth["engagement"]): DealHealth["risk"] {
  if (["won", "lost"].includes(String(lead.status))) return "Low";
  const days = daysSince(lead.last_contacted_at ?? lead.updatedAt);
  if (days !== null && days >= 10) return "High";
  if (engagement === "Low") return "Medium";
  if (!lead.budget && !lead.deal_value_cents) return "Medium";
  return "Low";
}

function expectedCloseLabel(lead: Lead): string {
  if (lead.expected_close_date) {
    return new Date(lead.expected_close_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  const timeline = lead.timeline?.toLowerCase() ?? "";
  const match = timeline.match(/(\d+)\s*day/);
  if (match) {
    const d = new Date();
    d.setDate(d.getDate() + Number(match[1]));
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  return "Not set";
}

function starsFromScore(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 55) return 3;
  if (score >= 35) return 2;
  return 1;
}

function buildAiSummary(lead: Lead, insights?: LeadAiInsights | null): string {
  const parts: string[] = [];
  const engagement = engagementLevel(lead);
  if (engagement === "High") parts.push("Client is highly engaged.");
  else if (engagement === "Low") parts.push("Engagement has dropped — re-activate the conversation.");

  if (lead.budget || lead.deal_value_cents) parts.push("Budget aligns with stated scope.");
  if (String(lead.status) === "proposal_sent") parts.push("Proposal is live — monitor opens and follow up within 48 hours.");
  if (insights?.insights?.[0]) parts.push(insights.insights[0]);
  if (parts.length === 0) parts.push("Complete discovery to sharpen close probability.");
  return parts.slice(0, 3).join(" ");
}

function recommendedAction(
  lead: Lead,
  insights?: LeadAiInsights | null,
): string {
  const fromApi = insights?.recommended_actions?.[0]?.label;
  if (fromApi) return fromApi;
  const status = String(lead.status ?? "new");
  if (status === "new" || status === "qualified") return "Schedule discovery call";
  if (status === "discovery_call") return "Generate proposal";
  if (status === "proposal_sent") return "Send follow-up email";
  if (status === "negotiation") return "Address objections and confirm timeline";
  return "Update next follow-up";
}

export function computeDealHealth(lead: Lead, score: number, insights?: LeadAiInsights | null): DealHealth {
  const engagement = engagementLevel(lead);
  const factors = computeScoreBreakdown(lead);
  const factorScore = factors.filter((f) => f.ok).length / factors.length;
  const prob = lead.probability ?? insights?.probability ?? 0;
  const healthPct = Math.round(score * 0.45 + prob * 0.35 + factorScore * 100 * 0.2);

  const dmMeta = getLeadMeta(lead, "decision_maker");
  let decisionMaker: DealHealth["decisionMaker"] = "Not confirmed";
  if (dmMeta) decisionMaker = "Confirmed";
  else if (lead.name) decisionMaker = "Likely";

  return {
    healthPct: Math.min(100, Math.max(0, healthPct)),
    stars: starsFromScore(healthPct),
    probability: prob,
    budgetMatchPct: budgetMatchPct(lead),
    engagement,
    decisionMaker,
    risk: dealRisk(lead, engagement),
    expectedCloseLabel: expectedCloseLabel(lead),
    aiSummary: buildAiSummary(lead, insights),
    recommendedAction: recommendedAction(lead, insights),
  };
}

export function renderStars(count: number): string {
  return "★".repeat(count) + "☆".repeat(5 - count);
}

export function lastReplyLabel(lead: Lead): string {
  const ref = lead.last_contacted_at ?? lead.updatedAt;
  const days = daysSince(ref);
  if (days === null) return "Never";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function buyingStageLabel(lead: Lead): string {
  const custom = getLeadMeta(lead, "buying_stage");
  if (custom) return custom;
  const map: Record<string, string> = {
    new: "Awareness",
    qualified: "Consideration",
    discovery_call: "Evaluation",
    proposal_sent: "Decision",
    negotiation: "Negotiation",
    won: "Closed won",
    lost: "Closed lost",
  };
  return map[String(lead.status ?? "new")] ?? "Discovery";
}

export function sourceLabel(lead: Lead): string {
  const src = lead.source ?? "manual";
  return LEAD_SOURCE_LABELS[src] ?? src;
}

export function statusLabel(lead: Lead): string {
  const st = String(lead.status ?? "new") as keyof typeof LEAD_STATUS_LABELS;
  return LEAD_STATUS_LABELS[st] ?? st;
}

export function tierFromScore(score: number): string {
  return scoreTier(score);
}

export type TimelineGroup = { label: string; events: { id: string; type: string; message?: string; created_at?: string }[] };

export function groupTimelineEvents<T extends { id: string; created_at?: string }>(
  events: T[],
): { label: string; events: T[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const buckets = new Map<string, T[]>();

  for (const ev of events) {
    const d = ev.created_at ? new Date(ev.created_at) : new Date();
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    let label: string;
    if (day.getTime() === today.getTime()) label = "Today";
    else if (day.getTime() === yesterday.getTime()) label = "Yesterday";
    else {
      label = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
    }
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(ev);
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({ label, events: items }));
}

export const ACTIVITY_FILTERS = [
  { id: "all", label: "All" },
  { id: "emails", label: "Emails" },
  { id: "calls", label: "Calls" },
  { id: "status", label: "Status" },
  { id: "files", label: "Files" },
  { id: "ai", label: "AI" },
] as const;

export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]["id"];

export function matchesActivityFilter(type: string, filter: ActivityFilter): boolean {
  if (filter === "all") return true;
  const t = type.toLowerCase();
  if (filter === "emails") return t.includes("email");
  if (filter === "calls") return t.includes("call") || t.includes("meeting");
  if (filter === "status") return t.includes("status") || t.includes("assigned");
  if (filter === "files") return t.includes("file");
  if (filter === "ai") return t.includes("proposal") || t.includes("ai");
  return true;
}

export type RelationshipMilestone = {
  key: string;
  label: string;
  done: boolean;
  hint?: string;
};

export function buildRelationshipMilestones(lead: Lead): RelationshipMilestone[] {
  const status = String(lead.status ?? "new");
  const order = ["new", "qualified", "discovery_call", "proposal_sent", "negotiation", "won"];
  const idx = order.indexOf(status);

  return [
    { key: "meeting", label: "Meeting", done: idx >= order.indexOf("discovery_call"), hint: "Discovery call" },
    { key: "proposal", label: "Proposal", done: Boolean(lead.converted_proposal_id) || idx >= order.indexOf("proposal_sent") },
    { key: "email", label: "Email", done: Boolean(lead.last_contacted_at) },
    { key: "call", label: "Call", done: idx >= order.indexOf("discovery_call") },
    { key: "whatsapp", label: "WhatsApp", done: lead.source === "whatsapp" },
    { key: "notes", label: "Notes", done: Boolean(lead.requirements || lead.message) },
    { key: "invoice", label: "Invoice", done: status === "won" },
    { key: "project", label: "Project", done: Boolean(lead.converted_project_id) },
  ];
}
