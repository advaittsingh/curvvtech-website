import { config } from "../../config.js";
import { forbidden, notFound } from "../../lib/errors.js";
import { normalizePlanTier, PLAN_LIMITS } from "./planLimits.js";
import type { DbQueryable } from "./planUsage.js";

/** Pro / Pro+ only: WA CRM AI (insights, follow-up drafts). */
export async function assertBusinessInsightsAllowed(db: DbQueryable, userId: string): Promise<void> {
  if (config.skipAuth) return;
  const ur = await db.query<{ plan_tier: string }>(`SELECT plan_tier FROM users WHERE id = $1::uuid`, [userId]);
  const row = ur.rows[0];
  if (!row) throw notFound("User not found");
  const tier = normalizePlanTier(row.plan_tier);
  if (!PLAN_LIMITS[tier].business_insights) {
    throw forbidden("Business insights require a Pro or Pro+ plan.");
  }
}
