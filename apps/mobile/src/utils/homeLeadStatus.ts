import type { Lead } from "../services/api";

/** Home list row: colored dot + friendly label (API uses hot/warm/closed). */
export function homeLeadRowMeta(lead: Lead): { dotColor: string; label: string } {
  if (lead.source === "whatsapp") {
    const s = lead.status.toLowerCase();
    if (s === "not_lead" || s === "closed") {
      return { dotColor: "#A78BFA", label: "Closed" };
    }
    if (s === "negotiating" || s === "interested") {
      return { dotColor: "#F97316", label: "Active" };
    }
    return { dotColor: "#22C55E", label: "New" };
  }
  const s = lead.status.toLowerCase();
  if (s === "hot") {
    return { dotColor: "#F97316", label: "Follow-up needed" };
  }
  if (s === "closed") {
    return { dotColor: "#A78BFA", label: "Closed" };
  }
  return { dotColor: "#22C55E", label: "New" };
}
