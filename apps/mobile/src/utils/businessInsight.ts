import type { Lead } from "../services/api";
import type { BusinessProfile } from "../storage/appStorage";

export type InsightCopy = { title: string; body: string };

/** Contextual insight from leads + stored business profile (questionnaire text). */
export function buildBusinessInsight(leads: Lead[], profile: BusinessProfile | null): InsightCopy {
  const now = Date.now();
  const overdue = leads.filter((l) => {
    if (l.source === "whatsapp") return false;
    if (!l.follow_up_at) return false;
    const t = new Date(l.follow_up_at).getTime();
    return !Number.isNaN(t) && t < now;
  }).length;

  const hot = leads.filter((l) => {
    const s = l.status.toLowerCase();
    if (l.source === "whatsapp") return s === "negotiating";
    return s === "hot";
  }).length;

  if (overdue >= 2) {
    return {
      title: "Follow-ups are waiting",
      body: `You have ${overdue} lead${overdue === 1 ? "" : "s"} past their follow-up time. A quick message now can recover momentum and conversions.`,
    };
  }

  if (hot >= 2) {
    return {
      title: "Hot leads need a fast reply",
      body: "Several leads are marked hot. Reaching out while interest is high dramatically improves close rates—try Ask AI to draft replies in seconds.",
    };
  }

  const challenge = profile?.questionnaire?.biggestChallenge;
  if (challenge === "forgetting") {
    return {
      title: "Never miss another follow-up",
      body: "You said forgetting follow-ups is a challenge. Set reminders on each lead and check Notifications daily so nothing slips through.",
    };
  }

  return {
    title: "Responding faster can boost conversions",
    body: "Leads are more likely to convert when you respond within the first few hours. Use Ask AI for draft replies and keep your pipeline moving.",
  };
}
