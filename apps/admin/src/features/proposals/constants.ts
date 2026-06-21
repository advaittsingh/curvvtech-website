export const PROPOSAL_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "negotiation",
  "approved",
  "rejected",
  "expired",
  "converted",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  negotiation: "Negotiation",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
};

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: "bg-stone-100 text-stone-700 border-stone-200",
  sent: "bg-blue-100 text-blue-800 border-blue-200",
  viewed: "bg-cyan-100 text-cyan-800 border-cyan-200",
  negotiation: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-stone-100 text-stone-500 border-stone-200",
  converted: "bg-violet-100 text-violet-800 border-violet-200",
};

export const PROPOSAL_TEMPLATES = [
  {
    key: "shopify",
    name: "Shopify Website",
    project_type: "Shopify Website",
    title: "Premium Shopify Store",
  },
  {
    key: "corporate",
    name: "Corporate Website",
    project_type: "Corporate Website",
    title: "Corporate Website Proposal",
  },
  {
    key: "mobile_app",
    name: "Mobile App",
    project_type: "Mobile App",
    title: "Mobile App Development",
  },
  {
    key: "web_app",
    name: "Web App",
    project_type: "Web Application",
    title: "Web Application Proposal",
  },
  {
    key: "smart_meter",
    name: "Smart Meter Solution",
    project_type: "Smart Meter",
    title: "Smart Meter Solution",
  },
  {
    key: "ai_solution",
    name: "AI Solution",
    project_type: "AI Solution",
    title: "AI Solution Proposal",
  },
  {
    key: "ai_agent",
    name: "AI Agent",
    project_type: "AI Agent",
    title: "AI Agent Proposal",
  },
  {
    key: "maintenance",
    name: "AMC Contract",
    project_type: "Maintenance",
    title: "Monthly Maintenance Agreement",
  },
] as const;

export {
  formatInr,
  formatOwnerDisplay,
  formatShortDate,
} from "../leads/constants";

/** Strip simple **bold** markdown markers for on-screen proposal text. */
export function formatProposalContent(text: string): string {
  return String(text ?? "").replace(/\*\*(.+?)\*\*/g, "$1");
}

export function formatCompactInr(cents: number): string {
  if (!cents) return "₹0";
  const rupees = cents / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rupees);
}

export type ProposalLineItem = { id: string; description: string; qty: number; amount_cents: number };
export type ProposalMilestone = { id: string; label: string; percent: number };
export type ProposalAddon = { id: string; name: string; amount_cents: number; selected?: boolean };
export type TimelineMilestone = {
  id: string;
  title: string;
  duration?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
};
export type ProposalSignature = {
  client_name?: string;
  designation?: string;
  signed_at?: string;
};

export type ScopeModuleGroup = { title: string; items: string[] };

export type BusinessAnalysisMeta = {
  company?: string;
  industry?: string;
  business_model?: string;
  growth_opportunity?: string;
  recommended_solution?: string;
  summary?: string;
};

export type ProposalMetadata = {
  business_analysis?: BusinessAnalysisMeta;
  scope_modules?: { groups: ScopeModuleGroup[] };
  line_items?: ProposalLineItem[];
  payment_milestones?: ProposalMilestone[];
  addons?: ProposalAddon[];
  timeline_milestones?: TimelineMilestone[];
  signature?: ProposalSignature;
  proposal_reference?: string;
};

export function defaultMetadata(totalCents = 0): ProposalMetadata {
  return {
    line_items: [
      { id: "1", description: "Design", qty: 1, amount_cents: Math.round(totalCents * 0.45) },
      { id: "2", description: "Development", qty: 1, amount_cents: Math.round(totalCents * 0.45) },
      { id: "3", description: "Premium animations", qty: 1, amount_cents: Math.round(totalCents * 0.1) },
    ],
    payment_milestones: [
      { id: "1", label: "50% Advance", percent: 50 },
      { id: "2", label: "30% Testing", percent: 30 },
      { id: "3", label: "20% Delivery", percent: 20 },
    ],
    addons: [
      { id: "1", name: "SEO Setup", amount_cents: 1000000 },
      { id: "2", name: "Monthly Maintenance", amount_cents: 500000 },
      { id: "3", name: "Product Upload", amount_cents: 700000 },
    ],
    timeline_milestones: [
      { id: "1", title: "Discovery", start_date: "", end_date: "", duration: "Week 1", description: "Requirements & strategy" },
      { id: "2", title: "Design", start_date: "", end_date: "", duration: "Week 2", description: "UI/UX & approvals" },
      { id: "3", title: "Development", start_date: "", end_date: "", duration: "Week 3–4", description: "Build & integrate" },
      { id: "4", title: "Testing", start_date: "", end_date: "", duration: "Week 5", description: "QA & revisions" },
      { id: "5", title: "Launch", start_date: "", end_date: "", duration: "Week 6", description: "Go live & handoff" },
    ],
    signature: {},
  };
}

export function sumLineItems(items: ProposalLineItem[] | undefined): number {
  return (items ?? []).reduce((s, i) => s + i.qty * i.amount_cents, 0);
}

export function computeProposalTotal(meta: ProposalMetadata, selectedAddonIds: string[] = []): number {
  const base = sumLineItems(meta.line_items);
  const addonTotal = (meta.addons ?? [])
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((s, a) => s + a.amount_cents, 0);
  return base + addonTotal;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Canonical consulting proposal structure — keep in sync with services/api proposalEngine.ts */
export const CONSULTING_PROPOSAL_SECTIONS = [
  { section_key: "cover", title: "Cover", block_type: "text" },
  { section_key: "executive_summary", title: "Executive Summary", block_type: "text" },
  { section_key: "business_understanding", title: "Business Understanding", block_type: "text" },
  { section_key: "project_objectives", title: "Project Objectives", block_type: "text" },
  { section_key: "proposed_solution", title: "Proposed Solution", block_type: "text" },
  { section_key: "detailed_scope", title: "Detailed Scope of Work", block_type: "scope_modules" },
  { section_key: "feature_recommendations", title: "Why We Recommend These Features", block_type: "text" },
  { section_key: "monetization", title: "Monetization Opportunities", block_type: "text" },
  { section_key: "ai_opportunities", title: "AI Opportunities", block_type: "text" },
  { section_key: "tech_architecture", title: "Technical Architecture", block_type: "text" },
  { section_key: "development_roadmap", title: "Development Roadmap", block_type: "timeline" },
  { section_key: "why_curvvtech", title: "Why CurvvTech", block_type: "text" },
  { section_key: "pricing", title: "Investment & Milestones", block_type: "pricing" },
  { section_key: "addons", title: "Optional Add-ons", block_type: "addons" },
  { section_key: "terms", title: "Terms & Conditions", block_type: "text" },
  { section_key: "signature", title: "Signature", block_type: "signature" },
] as const;

/** section_key → AI proposal-action (null = no per-section regenerate) */
export const PROPOSAL_SECTION_AI_ACTION: Record<string, string | null> = {
  cover: null,
  executive_summary: "executive_summary",
  business_understanding: "business_understanding",
  project_objectives: "project_objectives",
  proposed_solution: "proposed_solution",
  detailed_scope: "improve_scope",
  feature_recommendations: "feature_recommendations",
  monetization: "monetization",
  ai_opportunities: "ai_opportunities",
  tech_architecture: "tech_architecture",
  development_roadmap: "timeline",
  why_curvvtech: "why_curvvtech",
  pricing: "pricing",
  addons: null,
  terms: "terms",
  signature: null,
};

export type ProposalSectionRef = { section_key?: string; title: string; content?: string; id?: string; block_type?: string };

export type ConsultingAiResult = {
  cover?: string;
  business_analysis?: ProposalMetadata["business_analysis"];
  sections?: { section_key: string; content: string }[];
  scope_modules?: ProposalMetadata["scope_modules"];
  line_items?: Omit<ProposalLineItem, "id">[];
  payment_milestones?: Omit<ProposalMilestone, "id">[];
  timeline_milestones?: Omit<TimelineMilestone, "id">[];
  addons?: Omit<ProposalAddon, "id">[];
};

function pickSectionContent(aiContent: string | undefined, prevContent: string | undefined): string {
  if (aiContent?.trim()) return aiContent;
  if (prevContent?.trim()) return prevContent;
  return "";
}

const SECTION_KEY_ALIASES: Record<string, string> = {
  executive_summary: "executive_summary",
  "executive summary": "executive_summary",
  business_understanding: "business_understanding",
  project_objectives: "project_objectives",
  proposed_solution: "proposed_solution",
  detailed_scope: "detailed_scope",
  scope: "detailed_scope",
  "scope of work": "detailed_scope",
  deliverables: "detailed_scope",
  feature_recommendations: "feature_recommendations",
  monetization: "monetization",
  ai_opportunities: "ai_opportunities",
  tech_architecture: "tech_architecture",
  development_roadmap: "development_roadmap",
  timeline: "development_roadmap",
  why_curvvtech: "why_curvvtech",
  about: "why_curvvtech",
  "about curvvtech": "why_curvvtech",
  terms: "terms",
  cover: "cover",
};

function normalizeSectionKey(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const slug = normalized.replace(/\s+/g, "_");
  return SECTION_KEY_ALIASES[normalized] ?? SECTION_KEY_ALIASES[slug] ?? slug;
}

/** Build standard 16 consulting sections with AI content mapped by section_key. */
export function buildSectionsFromConsultingAi(
  existing: ProposalSectionRef[],
  result: ConsultingAiResult,
): ProposalSectionRef[] {
  const byKey = new Map(existing.filter((s) => s.section_key).map((s) => [s.section_key!, s]));
  const contentByKey: Record<string, string> = {};
  if (result.cover?.trim()) contentByKey.cover = result.cover;
  for (const s of result.sections ?? []) {
    if (s.section_key && s.content?.trim()) {
      contentByKey[normalizeSectionKey(s.section_key)] = s.content;
    }
  }

  return CONSULTING_PROPOSAL_SECTIONS.map((t) => {
    const prev = byKey.get(t.section_key);
    return {
      id: prev?.id ?? newId(),
      section_key: t.section_key,
      title: t.title,
      block_type: t.block_type,
      content: pickSectionContent(contentByKey[t.section_key], prev?.content),
    };
  });
}

/** Apply full consulting AI payload onto a proposal (mirrors server applyConsultingResult). */
export function mergeConsultingAiIntoProposal<
  T extends {
    sections?: ProposalSectionRef[];
    metadata_json?: ProposalMetadata;
    total_cents?: number;
  },
>(proposal: T, result: ConsultingAiResult): T {
  const sections = buildSectionsFromConsultingAi(proposal.sections ?? [], result);

  const line_items = ((result.line_items?.length ? result.line_items : proposal.metadata_json?.line_items) ?? []).map(
    (item, idx) => ({
      ...item,
      id: "id" in item && item.id ? item.id : newId(),
      qty: item.qty ?? 1,
      amount_cents: item.amount_cents ?? 0,
    }),
  ) as ProposalLineItem[];

  const payment_milestones = (
    (result.payment_milestones?.length ? result.payment_milestones : proposal.metadata_json?.payment_milestones) ?? []
  ).map((m, idx) => ({
    ...m,
    id: "id" in m && m.id ? m.id : String(idx + 1),
  })) as ProposalMilestone[];

  const timeline_milestones = (
    (result.timeline_milestones?.length ? result.timeline_milestones : proposal.metadata_json?.timeline_milestones) ?? []
  ).map((m, idx) => ({
    ...m,
    id: "id" in m && m.id ? m.id : String(idx + 1),
  })) as TimelineMilestone[];

  const addons = ((result.addons?.length ? result.addons : proposal.metadata_json?.addons) ?? []).map((a, idx) => ({
    ...a,
    id: "id" in a && a.id ? a.id : String(idx + 1),
  })) as ProposalAddon[];

  const metadata_json: ProposalMetadata = {
    ...proposal.metadata_json,
    business_analysis: result.business_analysis ?? proposal.metadata_json?.business_analysis,
    scope_modules: result.scope_modules?.groups?.length ? result.scope_modules : proposal.metadata_json?.scope_modules,
    line_items,
    payment_milestones,
    timeline_milestones,
    addons,
  };

  return {
    ...proposal,
    sections,
    metadata_json,
    total_cents: sumLineItems(line_items) || proposal.total_cents,
  };
}

export function getProposalAiRegenerateActions(sections: ProposalSectionRef[]) {
  return sections
    .filter((s) => s.section_key && PROPOSAL_SECTION_AI_ACTION[s.section_key])
    .map((s) => ({
      action: PROPOSAL_SECTION_AI_ACTION[s.section_key!]!,
      label: s.title,
      sectionKey: s.section_key!,
    }));
}

export const BLOCK_TYPES = [
  { key: "executive_summary", label: "Executive Summary", block_type: "text", section_key: "executive_summary", title: "Executive Summary", description: "Client-specific overview" },
  { key: "business_understanding", label: "Business Understanding", block_type: "text", section_key: "business_understanding", title: "Business Understanding", description: "Industry & challenges" },
  { key: "project_objectives", label: "Project Objectives", block_type: "text", section_key: "project_objectives", title: "Project Objectives", description: "Goals from requirements" },
  { key: "proposed_solution", label: "Proposed Solution", block_type: "text", section_key: "proposed_solution", title: "Proposed Solution", description: "Platform overview" },
  { key: "detailed_scope", label: "Detailed Scope", block_type: "scope_modules", section_key: "detailed_scope", title: "Detailed Scope of Work", description: "Website, app, admin modules" },
  { key: "feature_recommendations", label: "Feature Recommendations", block_type: "text", section_key: "feature_recommendations", title: "Why We Recommend These Features", description: "Consultative rationale" },
  { key: "monetization", label: "Monetization", block_type: "text", section_key: "monetization", title: "Monetization Opportunities", description: "Revenue streams" },
  { key: "ai_opportunities", label: "AI Opportunities", block_type: "text", section_key: "ai_opportunities", title: "AI Opportunities", description: "AI features for client" },
  { key: "tech_architecture", label: "Tech Architecture", block_type: "text", section_key: "tech_architecture", title: "Technical Architecture", description: "Stack & scalability" },
  { key: "development_roadmap", label: "Development Roadmap", block_type: "timeline", section_key: "development_roadmap", title: "Development Roadmap", description: "Phased delivery" },
  { key: "why_curvvtech", label: "Why CurvvTech", block_type: "text", section_key: "why_curvvtech", title: "Why CurvvTech", description: "Partnership rationale" },
  { key: "pricing", label: "Pricing Table", block_type: "pricing", section_key: "pricing", title: "Investment & Milestones", description: "Line items & milestones" },
  { key: "timeline", label: "Timeline", block_type: "timeline", section_key: "timeline", title: "Project Timeline", description: "Milestone schedule" },
  { key: "deliverables", label: "Deliverables", block_type: "text", section_key: "scope", title: "Scope & Deliverables", description: "What you'll receive" },
  { key: "testimonials", label: "Testimonials", block_type: "text", section_key: "testimonials", title: "Client Testimonials", description: "Social proof" },
  { key: "faq", label: "FAQ", block_type: "text", section_key: "faq", title: "FAQ", description: "Common questions" },
  { key: "terms", label: "Terms", block_type: "text", section_key: "terms", title: "Terms & Conditions", description: "Legal terms" },
  { key: "addons", label: "Add-ons", block_type: "addons", section_key: "addons", title: "Optional Add-ons", description: "Upsell options" },
  { key: "signature", label: "Signature", block_type: "signature", section_key: "signature", title: "Signature", description: "Sign-off block" },
  { key: "custom", label: "Custom Section", block_type: "text", section_key: "custom", title: "Custom Section", description: "Free-form content" },
] as const;

export const PROJECT_TYPE_PROMPTS: Record<string, string> = {
  "Shopify Website": "luxury ecommerce / Shopify store proposal with product catalog, checkout, and brand experience",
  "Corporate Website": "corporate B2B website with brand positioning, CMS, and lead generation",
  "Mobile App": "mobile app development with iOS/Android, UX flows, and app store launch",
  "Web Application": "custom web application with dashboards, auth, and scalable architecture",
  "Web App": "custom web application with dashboards, auth, and scalable architecture",
  "AI Solution": "AI agent / automation solution with integrations, workflows, and ROI",
  "AI Agent": "AI agent platform with custom workflows, knowledge base, and deployment",
  "Smart Meter": "IoT smart meter solution with hardware integration, dashboards, and compliance",
  Maintenance: "AMC / monthly maintenance contract with SLA and support scope",
};
