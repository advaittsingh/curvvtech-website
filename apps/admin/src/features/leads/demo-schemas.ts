export type DemoIntelligence = {
  company?: string;
  industry?: string;
  business_type?: string;
  project_type?: string;
  budget_range?: string;
  budget_min_cents?: number;
  budget_max_cents?: number;
  timeline?: string;
  urgency?: string;
  website?: string;
  location?: string;
  requirements_summary?: string;
  features?: string[];
  lead_score?: number;
  score_100?: number;
  confidence_percent?: number;
  close_probability?: number;
  potential_value_label?: string;
  project_complexity?: string;
  recommended_services?: string[];
  recommended_proposal?: string;
  ai_summary?: string;
  recommended_solution?: string;
  estimated_budget_label?: string;
  risks?: string[];
  upsells?: string[];
};

export type InboundOpportunity = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  date?: string;
  time?: string;
  status?: string;
  sales_stage?: string | null;
  display_status?: string;
  message?: string | null;
  requirements?: string | null;
  project_type?: string | null;
  budget?: string | null;
  timeline?: string | null;
  website?: string | null;
  location?: string | null;
  inbound_source?: string | null;
  ai_intelligence?: DemoIntelligence | null;
  lead_score?: number | null;
  deal_value_cents?: number | null;
  close_probability?: number | null;
  assigned_user_id?: string | null;
  converted_lead_id?: string | null;
  converted_client_id?: string | null;
  analyzed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type InboundPipelineSummary = {
  total: number;
  pending: number;
  confirmed: number;
  converted: number;
  total_value_cents: number;
  expected_revenue_cents?: number;
  avg_score: number;
};

export type InboundActivity = {
  id: string;
  event_type: string;
  title: string;
  description?: string | null;
  created_at: string;
};

export const SALES_STAGES = [
  "new",
  "qualified",
  "discovery_scheduled",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;

export type SalesStage = (typeof SALES_STAGES)[number];

export const SALES_STAGE_LABELS: Record<SalesStage, string> = {
  new: "New",
  qualified: "Qualified",
  discovery_scheduled: "Discovery scheduled",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const SALES_STAGE_COLORS: Record<SalesStage, string> = {
  new: "bg-amber-100 text-amber-800 border-amber-200",
  qualified: "bg-sky-100 text-sky-800 border-sky-200",
  discovery_scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  proposal_sent: "bg-violet-100 text-violet-800 border-violet-200",
  negotiation: "bg-orange-100 text-orange-800 border-orange-200",
  won: "bg-emerald-100 text-emerald-800 border-emerald-200",
  lost: "bg-stone-100 text-stone-600 border-stone-200",
};

export function score100FromDemo(row: InboundOpportunity): number {
  if (row.ai_intelligence?.score_100) return row.ai_intelligence.score_100;
  if (row.lead_score != null) return Math.round(Number(row.lead_score) * 10);
  return buildPreviewIntel(row).score_100 ?? 60;
}

export function formatScore100(row: InboundOpportunity): string {
  const s = score100FromDemo(row);
  return s > 0 ? `${s}/100` : "—";
}

/** Client-side preview when AI hasn't run yet — never show empty dashes. */
export function buildPreviewIntel(row: InboundOpportunity): DemoIntelligence {
  let score100 = 58;
  if (row.company) score100 += 12;
  if (row.phone) score100 += 6;
  if (row.message || row.requirements) score100 += 14;
  if (row.website) score100 += 5;
  score100 = Math.min(88, score100);
  const value = "₹80,000 – ₹1,20,000";
  return {
    score_100: score100,
    lead_score: score100 / 10,
    close_probability: Math.min(80, 30 + Math.round(score100 * 0.4)),
    potential_value_label: value,
    estimated_budget_label: value,
    project_complexity: "Medium",
    business_type: row.company ? "Growing Business" : "Individual / SMB",
    project_type: row.project_type ?? "Custom Software",
    recommended_services: ["Website", "Admin Panel", "CRM"],
    recommended_proposal: "Digital Transformation Package",
    recommended_solution: row.project_type ?? "Custom web platform",
    ai_summary:
      row.message ?? row.requirements
        ? `This enquiry appears to be from ${row.company ?? row.name} seeking a custom software solution. We recommend a discovery call to define requirements before preparing a proposal.`
        : `${row.name} submitted an inbound enquiry. Qualify scope and budget on first contact.`,
    upsells: ["Mobile App", "CRM", "AI Automation"],
  };
}

export function resolveIntel(row: InboundOpportunity): DemoIntelligence {
  const intel = row.ai_intelligence;
  if (intel?.ai_summary || intel?.score_100 || intel?.potential_value_label) {
    return { ...buildPreviewIntel(row), ...intel, score_100: intel.score_100 ?? score100FromDemo(row) };
  }
  if (row.analyzed_at) return buildPreviewIntel(row);
  return buildPreviewIntel(row);
}
