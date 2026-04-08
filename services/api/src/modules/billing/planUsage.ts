import type pg from "pg";
import { config } from "../../config.js";
import { forbidden, notFound } from "../../lib/errors.js";
import { normalizePlanTier, PLAN_LIMITS, type PlanTier } from "./planLimits.js";

/** Pool or PoolClient — same `.query` for transactions. */
export type DbQueryable = Pick<pg.Pool, "query">;

export type MonthlyUsageCounts = {
  leads: number;
  ai_assistant_user_messages: number;
  follow_up_business_messages: number;
};

export type PlanQuotaKind = "lead" | "ai_user_message" | "follow_up_message";

export async function loadMonthlyUsage(
  db: DbQueryable,
  userId: string
): Promise<{ tier: PlanTier; counts: MonthlyUsageCounts }> {
  const ur = await db.query<{ plan_tier: string }>(`SELECT plan_tier FROM users WHERE id = $1::uuid`, [userId]);
  const planRow = ur.rows[0];
  if (!planRow) {
    throw notFound("User not found");
  }
  const tier = normalizePlanTier(planRow.plan_tier);

  const [waLeadsR, manualLeadsR, aiR, fuR] = await Promise.all([
    db.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM wa_leads wl
       INNER JOIN wa_conversations c ON c.id = wl.conversation_id
       WHERE c.user_id = $1::uuid AND wl.created_at >= date_trunc('month', now())`,
      [userId]
    ),
    db.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM leads
       WHERE user_id = $1::uuid AND created_at >= date_trunc('month', now())`,
      [userId]
    ),
    db.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM ai_chat_messages
       WHERE user_id = $1::uuid AND role = 'user' AND created_at >= date_trunc('month', now())`,
      [userId]
    ),
    db.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM wa_messages m
       INNER JOIN wa_conversations c ON c.id = m.conversation_id
       WHERE c.user_id = $1::uuid AND m.sender = 'business' AND m.created_at >= date_trunc('month', now())`,
      [userId]
    ),
  ]);

  const counts: MonthlyUsageCounts = {
    leads: Number(waLeadsR.rows[0]?.c ?? 0) + Number(manualLeadsR.rows[0]?.c ?? 0),
    ai_assistant_user_messages: Number(aiR.rows[0]?.c ?? 0),
    follow_up_business_messages: Number(fuR.rows[0]?.c ?? 0),
  };

  return { tier, counts };
}

export function assertWithinPlanLimits(
  tier: PlanTier,
  counts: MonthlyUsageCounts,
  kind: PlanQuotaKind
): void {
  const limits = PLAN_LIMITS[tier];
  if (kind === "lead" && limits.leads_per_month != null && counts.leads >= limits.leads_per_month) {
    throw forbidden("Monthly lead limit reached. Upgrade to Pro for unlimited leads.");
  }
  if (
    kind === "ai_user_message" &&
    limits.ai_assistant_messages_per_month != null &&
    counts.ai_assistant_user_messages >= limits.ai_assistant_messages_per_month
  ) {
    throw forbidden("Monthly AI assistant message limit reached. Upgrade to Pro for unlimited messages.");
  }
  if (
    kind === "follow_up_message" &&
    limits.follow_up_automations_per_month != null &&
    counts.follow_up_business_messages >= limits.follow_up_automations_per_month
  ) {
    throw forbidden("Monthly follow-up message limit reached. Upgrade to Pro for unlimited automations.");
  }
}

/** Enforce plan caps (skipped when SKIP_AUTH=true for local dev). */
export async function assertQuota(db: DbQueryable, userId: string, kind: PlanQuotaKind): Promise<void> {
  if (config.skipAuth) return;
  const { tier, counts } = await loadMonthlyUsage(db, userId);
  assertWithinPlanLimits(tier, counts, kind);
}

export function buildUsageJsonResponse(tier: PlanTier, counts: MonthlyUsageCounts, period: string) {
  const limits = PLAN_LIMITS[tier];
  return {
    period,
    plan_tier: tier,
    limits,
    used: {
      leads: counts.leads,
      ai_assistant_messages: counts.ai_assistant_user_messages,
      follow_up_messages: counts.follow_up_business_messages,
    },
    remaining: {
      leads: limits.leads_per_month == null ? null : Math.max(0, limits.leads_per_month - counts.leads),
      ai_assistant_messages:
        limits.ai_assistant_messages_per_month == null
          ? null
          : Math.max(0, limits.ai_assistant_messages_per_month - counts.ai_assistant_user_messages),
      follow_up_automations:
        limits.follow_up_automations_per_month == null
          ? null
          : Math.max(0, limits.follow_up_automations_per_month - counts.follow_up_business_messages),
    },
  };
}
