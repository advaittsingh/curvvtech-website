/** Plan identifiers — must match `users.plan_tier` and Razorpay plan mapping in config. */
export type PlanTier = "free" | "pro" | "pro_plus";

export type PlanLimits = {
  leads_per_month: number | null; // null = unlimited
  ai_assistant_messages_per_month: number | null;
  follow_up_automations_per_month: number | null;
  business_insights: boolean;
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    leads_per_month: 20,
    ai_assistant_messages_per_month: 50,
    follow_up_automations_per_month: 100,
    business_insights: false,
  },
  pro: {
    leads_per_month: null,
    ai_assistant_messages_per_month: null,
    follow_up_automations_per_month: null,
    business_insights: true,
  },
  pro_plus: {
    leads_per_month: null,
    ai_assistant_messages_per_month: null,
    follow_up_automations_per_month: null,
    business_insights: true,
  },
};

export function normalizePlanTier(raw: string | null | undefined): PlanTier {
  const s = (raw || "free").toLowerCase();
  if (s === "pro_plus" || s === "pro+") return "pro_plus";
  if (s === "pro") return "pro";
  return "free";
}
