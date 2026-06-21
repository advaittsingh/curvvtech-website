export {
  formatInr,
  formatOwnerDisplay,
  formatShortDate,
  formatRelativeDays,
} from "../leads/constants";

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  active: "Active Client",
  inactive: "Inactive",
  churned: "Churned",
};

export const CLIENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inactive: "bg-stone-100 text-stone-600 border-stone-200",
  churned: "bg-red-100 text-red-800 border-red-200",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700 border-stone-200",
  sent: "bg-blue-100 text-blue-800 border-blue-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-stone-100 text-stone-500 border-stone-200",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

export const COMM_CHANNEL_LABELS: Record<string, string> = {
  email: "Email sent",
  phone: "Call completed",
  whatsapp: "WhatsApp message sent",
  meeting: "Meeting completed",
  proposal: "Proposal shared",
  invoice: "Invoice sent",
  reminder: "Reminder sent",
  other: "Activity logged",
};

export const FILE_CATEGORIES = [
  { key: "contracts", label: "Contracts", description: "Signed agreements" },
  { key: "brand", label: "Brand assets", description: "Logos and style guides" },
  { key: "requirements", label: "Requirements", description: "Briefs and scope docs" },
  { key: "invoices", label: "Invoices", description: "Invoice PDFs" },
  { key: "projects", label: "Project files", description: "Deliverables and assets" },
] as const;

export const PORTAL_URL = "https://client.curvvtech.com";

export function healthTier(score: number): "healthy" | "watch" | "at_risk" {
  if (score >= 80) return "healthy";
  if (score >= 60) return "watch";
  return "at_risk";
}

export function healthTierColor(tier: ReturnType<typeof healthTier>): string {
  if (tier === "healthy") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (tier === "watch") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function healthTierLabel(tier: ReturnType<typeof healthTier>): string {
  if (tier === "healthy") return "Healthy";
  if (tier === "watch") return "Watch";
  return "At risk";
}
