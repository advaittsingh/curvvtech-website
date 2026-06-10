import type { Lead } from "../services/api";
import { colors } from "../theme/colors";

/** Maps API status to product labels (manual + WhatsApp CRM stages). */
export function statusToLabel(status: string): "HOT" | "WARM" | "COLD" {
  const s = status.toLowerCase();
  if (s === "hot" || s === "negotiating") return "HOT";
  if (s === "closed" || s === "not_lead") return "COLD";
  if (s === "interested" || s === "new") return "WARM";
  if (s === "follow-up") return "WARM";
  return "WARM";
}

export function labelColor(label: string) {
  if (label === "HOT") return colors.hot;
  if (label === "COLD") return colors.cold;
  return colors.warm;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

/** Leads with follow_up_at today or overdue (including no time = still count overdue if in past). */
export function countFollowUpsToday(leads: Lead[]): number {
  const now = Date.now();
  const sod = startOfDay(new Date());
  const eod = endOfDay(new Date());
  return leads.filter((l) => {
    if (l.source === "whatsapp") return false;
    if (!l.follow_up_at) return false;
    const t = new Date(l.follow_up_at).getTime();
    if (Number.isNaN(t)) return false;
    if (t < now) return true; // overdue
    return t >= sod && t <= eod;
  }).length;
}

export function urgentLeads(leads: Lead[]): Lead[] {
  const now = Date.now();
  return leads
    .filter((l) => {
      if (l.source === "whatsapp") return false;
      if (!l.follow_up_at) return false;
      const t = new Date(l.follow_up_at).getTime();
      return !Number.isNaN(t) && t <= now + 7 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => {
      const ta = a.follow_up_at ? new Date(a.follow_up_at).getTime() : Infinity;
      const tb = b.follow_up_at ? new Date(b.follow_up_at).getTime() : Infinity;
      return ta - tb;
    });
}
