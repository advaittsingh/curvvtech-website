export const LEAD_STATUSES = [
  "new",
  "qualified",
  "discovery_call",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  qualified: "Qualified",
  discovery_call: "Discovery Call",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  qualified: "bg-cyan-100 text-cyan-800 border-cyan-200",
  discovery_call: "bg-violet-100 text-violet-800 border-violet-200",
  proposal_sent: "bg-indigo-100 text-indigo-800 border-indigo-200",
  negotiation: "bg-amber-100 text-amber-800 border-amber-200",
  won: "bg-emerald-100 text-emerald-800 border-emerald-200",
  lost: "bg-stone-100 text-stone-600 border-stone-200",
};

export const LEAD_SOURCES = [
  "website",
  "referral",
  "instagram",
  "linkedin",
  "whatsapp",
  "cold_outreach",
  "google",
  "manual",
  "contact",
  "demo",
] as const;

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  cold_outreach: "Cold Outreach",
  google: "Google",
  manual: "Manual",
  contact: "Contact Form",
  demo: "Demo Request",
};

export const LEAD_PRIORITIES = ["low", "medium", "high"] as const;

export function scoreTier(score: number): "hot" | "warm" | "cold" {
  if (score >= 75) return "hot";
  if (score >= 45) return "warm";
  return "cold";
}

export function scoreTierLabel(tier: "hot" | "warm" | "cold"): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function scoreTierColor(tier: "hot" | "warm" | "cold"): string {
  if (tier === "hot") return "bg-red-100 text-red-800 border-red-200";
  if (tier === "warm") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-sky-100 text-sky-800 border-sky-200";
}

export function formatRelativeDays(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function formatInr(cents: number | null | undefined): string {
  if (!cents) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatOwnerDisplay(email: string | null | undefined): string {
  if (!email) return "Unassigned";
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatNextFollowUp(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not set";
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(target);
  targetDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return formatShortDate(dateStr);
}

export const NOTE_CATEGORIES = ["meeting", "requirements", "internal"] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  meeting: "Meeting Notes",
  requirements: "Requirements",
  internal: "Internal Notes",
};

export const NOTE_CATEGORY_PREFIX: Record<NoteCategory, string> = {
  meeting: "[Meeting Notes]",
  requirements: "[Requirements]",
  internal: "[Internal Notes]",
};

export function parseNoteCategory(body: string): { category: NoteCategory | "legacy"; text: string } {
  for (const cat of NOTE_CATEGORIES) {
    const prefix = NOTE_CATEGORY_PREFIX[cat];
    if (body.startsWith(prefix)) {
      return { category: cat, text: body.slice(prefix.length).trim() };
    }
  }
  return { category: "legacy", text: body };
}

export const FILE_CATEGORIES = [
  { key: "requirements", label: "Requirements PDF", description: "Briefs and scope documents" },
  { key: "references", label: "Reference Websites", description: "Inspiration and competitor links" },
  { key: "brand", label: "Logo Files", description: "Brand assets and style guides" },
  { key: "contracts", label: "Contracts", description: "Signed agreements" },
  { key: "proposals", label: "Proposal PDFs", description: "Generated proposals" },
] as const;
