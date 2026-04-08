import crypto from "node:crypto";
import type { Request, Response } from "express";
import { Router } from "express";
import { config } from "../../config.js";
import { pool } from "../../db.js";
import { jsonError } from "../../lib/jsonError.js";
import { normalizePlanTier } from "../../modules/billing/planLimits.js";
import { buildUsageJsonResponse, loadMonthlyUsage } from "../../modules/billing/planUsage.js";
import { getRazorpay, razorpayConfigured } from "../../modules/billing/razorpayClient.js";

export const billingRoutes = Router();

type UserBillingRow = {
  plan_tier: string;
  razorpay_customer_id: string | null;
  billing_subscription_id: string | null;
  billing_subscription_status: string;
  email: string | null;
};

async function getUserBillingRow(userId: string): Promise<UserBillingRow | null> {
  const r = await pool.query<UserBillingRow>(
    `SELECT plan_tier, razorpay_customer_id, billing_subscription_id, billing_subscription_status, email
     FROM users WHERE id = $1::uuid`,
    [userId]
  );
  return r.rows[0] ?? null;
}

function paidSubscriptionActive(row: UserBillingRow): boolean {
  const st = (row.billing_subscription_status || "").toLowerCase();
  return ["active", "authenticated", "charged"].includes(st) && row.plan_tier !== "free";
}

billingRoutes.get("/me/billing/summary", async (req, res) => {
  const userId = req.internalUser!.id;
  const row = await getUserBillingRow(userId);
  if (!row) {
    jsonError(res, 404, "NOT_FOUND", "User not found");
    return;
  }
  const pm = await pool.query(
    `SELECT id, method, last4, brand, network, is_default, created_at
     FROM billing_payment_methods WHERE user_id = $1::uuid ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  return res.json({
    plan_tier: normalizePlanTier(row.plan_tier),
    razorpay_key_id: config.razorpayKeyId || null,
    billing_subscription_id: row.billing_subscription_id,
    billing_subscription_status: row.billing_subscription_status,
    razorpay_customer_id: row.razorpay_customer_id,
    has_razorpay: razorpayConfigured(),
    payment_methods: pm.rows,
    /** True when no saved payment method — at least one must remain on file (see delete handler). */
    payment_required: pm.rows.length === 0,
    paid_subscription_active: paidSubscriptionActive(row),
  });
});

billingRoutes.get("/me/billing/plans", (_req, res) => {
  return res.json({
    plans: [
      { id: "free", name: "Free", price_inr_month: 0 },
      {
        id: "pro",
        name: "Pro",
        razorpay_plan_ids: {
          monthly: config.razorpayPlanProMonthly || null,
          annual: config.razorpayPlanProAnnual || null,
        },
      },
      {
        id: "pro_plus",
        name: "Pro+",
        razorpay_plan_ids: {
          monthly: config.razorpayPlanProPlusMonthly || null,
          annual: config.razorpayPlanProPlusAnnual || null,
        },
      },
    ],
  });
});

billingRoutes.post("/me/billing/customer", async (req, res) => {
  const userId = req.internalUser!.id;
  const rz = getRazorpay();
  if (!rz) {
    jsonError(res, 503, "BILLING_NOT_CONFIGURED", "Razorpay is not configured");
    return;
  }

  const row = await getUserBillingRow(userId);
  if (!row) {
    jsonError(res, 404, "NOT_FOUND", "User not found");
    return;
  }
  if (row.razorpay_customer_id) {
    return res.json({ customer_id: row.razorpay_customer_id });
  }

  const email = row.email?.trim() || req.internalUser!.email || "";
  const name = email.split("@")[0] || "Customer";

  const customer = (await (rz.customers as unknown as { create: (p: Record<string, unknown>) => Promise<{ id: string }> }).create({
    name,
    email: email || undefined,
    fail_existing: 0,
    notes: { followup_user_id: String(userId) },
  })) as { id: string };

  await pool.query(`UPDATE users SET razorpay_customer_id = $2, updated_at = now() WHERE id = $1::uuid`, [
    userId,
    customer.id,
  ]);

  return res.json({ customer_id: customer.id });
});

billingRoutes.post("/me/billing/subscribe", async (req, res) => {
  const userId = req.internalUser!.id;
  const rz = getRazorpay();
  if (!rz) {
    jsonError(res, 503, "BILLING_NOT_CONFIGURED", "Razorpay is not configured");
    return;
  }

  const plan = String((req.body as { plan?: string })?.plan || "").toLowerCase();
  const interval = String((req.body as { interval?: string })?.interval || "monthly").toLowerCase();
  if (plan !== "pro" && plan !== "pro_plus") {
    jsonError(res, 400, "INVALID_PLAN", "Plan must be pro or pro_plus");
    return;
  }

  let planId = "";
  if (plan === "pro") {
    planId = interval === "annual" ? config.razorpayPlanProAnnual : config.razorpayPlanProMonthly;
  } else {
    planId = interval === "annual" ? config.razorpayPlanProPlusAnnual : config.razorpayPlanProPlusMonthly;
  }
  if (!planId) {
    jsonError(res, 503, "PLAN_NOT_CONFIGURED", "Razorpay plan_id missing in server env");
    return;
  }

  const row = await getUserBillingRow(userId);
  if (!row) {
    jsonError(res, 404, "NOT_FOUND", "User not found");
    return;
  }

  let customerId = row.razorpay_customer_id;
  if (!customerId) {
    const email = row.email?.trim() || req.internalUser!.email || "";
    const name = email.split("@")[0] || "Customer";
    const customer = (await (rz.customers as unknown as { create: (p: Record<string, unknown>) => Promise<{ id: string }> }).create({
      name,
      email: email || undefined,
      fail_existing: 0,
      notes: { followup_user_id: String(userId) },
    })) as { id: string };
    customerId = customer.id;
    await pool.query(`UPDATE users SET razorpay_customer_id = $2, updated_at = now() WHERE id = $1::uuid`, [
      userId,
      customerId,
    ]);
  }

  const totalCount = interval === "annual" ? 1 : 12;

  // Razorpay typings omit `customer_id` on subscription create; runtime accepts it.
  const sub = (await (rz.subscriptions as unknown as { create: (p: Record<string, unknown>) => Promise<{ id: string; short_url?: string; status: string }> }).create({
    plan_id: planId,
    customer_notify: 1,
    total_count: totalCount,
    quantity: 1,
    customer_id: customerId,
    notes: { followup_user_id: String(userId), plan, interval },
  })) as { id: string; short_url?: string; status: string };

  await pool.query(
    `UPDATE users SET billing_subscription_id = $2, billing_subscription_status = $3, updated_at = now() WHERE id = $1::uuid`,
    [userId, sub.id, sub.status || "created"]
  );

  return res.json({
    subscription_id: sub.id,
    short_url: sub.short_url,
    status: sub.status,
    key_id: config.razorpayKeyId,
  });
});

billingRoutes.post("/me/billing/payments/verify", async (req, res) => {
  const userId = req.internalUser!.id;
  const rz = getRazorpay();
  if (!rz) {
    jsonError(res, 503, "BILLING_NOT_CONFIGURED", "Razorpay is not configured");
    return;
  }

  const body = req.body as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  if (!orderId || !paymentId || !signature) {
    jsonError(res, 400, "VALIDATION_ERROR", "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required");
    return;
  }

  const expected = crypto
    .createHmac("sha256", config.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  if (expected !== signature) {
    jsonError(res, 400, "INVALID_SIGNATURE", "Payment signature verification failed");
    return;
  }

  const pay = (await rz.payments.fetch(paymentId)) as {
    id: string;
    token_id?: string;
    card?: { last4?: string; network?: string };
    method?: string;
  };

  const tokenId = pay.token_id;
  if (!tokenId) {
    jsonError(
      res,
      400,
      "NO_PAYMENT_TOKEN",
      "No token on payment — use a card that supports tokenization"
    );
    return;
  }

  const last4 = pay.card?.last4 ?? "";
  const brand = pay.card?.network ?? pay.method ?? "card";

  const dup = await pool.query(`SELECT id FROM billing_payment_methods WHERE user_id = $1::uuid AND razorpay_token_id = $2`, [
    userId,
    tokenId,
  ]);
  if (dup.rowCount && dup.rowCount > 0) {
    return res.json({ ok: true, payment_method_id: dup.rows[0]!.id });
  }

  await pool.query(`UPDATE billing_payment_methods SET is_default = false WHERE user_id = $1::uuid`, [userId]);

  const ins = await pool.query<{ id: string }>(
    `INSERT INTO billing_payment_methods (user_id, razorpay_token_id, method, last4, brand, network, is_default)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, true)
     RETURNING id`,
    [userId, tokenId, pay.method || "card", last4, brand, pay.card?.network ?? ""]
  );

  return res.json({ ok: true, payment_method_id: ins.rows[0]?.id });
});

billingRoutes.post("/me/billing/orders/card-setup", async (req, res) => {
  const userId = req.internalUser!.id;
  const rz = getRazorpay();
  if (!rz) {
    jsonError(res, 503, "BILLING_NOT_CONFIGURED", "Razorpay is not configured");
    return;
  }

  const row = await getUserBillingRow(userId);
  if (!row) {
    jsonError(res, 404, "NOT_FOUND", "User not found");
    return;
  }

  let customerId = row.razorpay_customer_id;
  if (!customerId) {
    const email = row.email?.trim() || req.internalUser!.email || "";
    const name = email.split("@")[0] || "Customer";
    const customer = (await (rz.customers as unknown as { create: (p: Record<string, unknown>) => Promise<{ id: string }> }).create({
      name,
      email: email || undefined,
      fail_existing: 0,
      notes: { followup_user_id: String(userId) },
    })) as { id: string };
    customerId = customer.id;
    await pool.query(`UPDATE users SET razorpay_customer_id = $2, updated_at = now() WHERE id = $1::uuid`, [
      userId,
      customerId,
    ]);
  }

  const order = (await (rz.orders as unknown as { create: (p: Record<string, unknown>) => Promise<{ id: string }> }).create({
    amount: 100,
    currency: "INR",
    receipt: `card_${userId.slice(0, 8)}`,
    notes: { purpose: "card_setup", user_id: String(userId) },
  })) as { id: string };

  return res.json({
    order_id: order.id,
    amount: 100,
    currency: "INR",
    key_id: config.razorpayKeyId,
    customer_id: customerId,
    name: row.email?.split("@")[0] || "FollowUp",
    email: row.email || req.internalUser!.email || "",
  });
});

billingRoutes.get("/me/billing/invoices", async (req, res) => {
  const userId = req.internalUser!.id;
  const r = await pool.query(
    `SELECT id, razorpay_invoice_id, amount_cents, currency, status, pdf_url, host_invoice_url, short_url, issued_at
     FROM billing_invoices WHERE user_id = $1::uuid ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  return res.json({ invoices: r.rows });
});

billingRoutes.patch("/me/billing/payment-methods/:id/default", async (req, res) => {
  const userId = req.internalUser!.id;
  const id = req.params.id;
  const ex = await pool.query(`SELECT id FROM billing_payment_methods WHERE id = $1::uuid AND user_id = $2::uuid`, [
    id,
    userId,
  ]);
  if (!ex.rowCount) {
    jsonError(res, 404, "NOT_FOUND", "Payment method not found");
    return;
  }

  await pool.query(`UPDATE billing_payment_methods SET is_default = false WHERE user_id = $1::uuid`, [userId]);
  await pool.query(`UPDATE billing_payment_methods SET is_default = true, updated_at = now() WHERE id = $1::uuid`, [id]);
  return res.json({ ok: true });
});

billingRoutes.delete("/me/billing/payment-methods/:id", async (req, res) => {
  const userId = req.internalUser!.id;
  const id = req.params.id;
  const row = await getUserBillingRow(userId);
  if (!row) {
    jsonError(res, 404, "NOT_FOUND", "User not found");
    return;
  }

  const pm = await pool.query(
    `SELECT id, razorpay_token_id FROM billing_payment_methods WHERE id = $1::uuid AND user_id = $2::uuid`,
    [id, userId]
  );
  if (!pm.rowCount) {
    jsonError(res, 404, "NOT_FOUND", "Payment method not found");
    return;
  }

  const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM billing_payment_methods WHERE user_id = $1::uuid`, [userId]);
  const count = (countR.rows[0] as { c: number }).c;

  if (count <= 1) {
    return res.status(400).json({
      error: "LAST_PAYMENT_METHOD",
      message:
        "Add another payment method before removing this one. At least one method must stay on file for your account.",
    });
  }

  const rz = getRazorpay();
  const tokenId = (pm.rows[0] as { razorpay_token_id: string }).razorpay_token_id;
  if (rz && row.razorpay_customer_id) {
    try {
      await rz.customers.deleteToken(row.razorpay_customer_id, tokenId);
    } catch {
      /* ignore Razorpay delete errors; still remove locally */
    }
  }

  await pool.query(`DELETE FROM billing_payment_methods WHERE id = $1::uuid`, [id]);
  return res.json({ ok: true });
});

billingRoutes.post("/me/billing/downgrade", async (req, res) => {
  const userId = req.internalUser!.id;
  const row = await getUserBillingRow(userId);
  if (!row) {
    jsonError(res, 404, "NOT_FOUND", "User not found");
    return;
  }

  const rz = getRazorpay();
  if (row.billing_subscription_id && rz) {
    try {
      await rz.subscriptions.cancel(row.billing_subscription_id);
    } catch {
      /* continue */
    }
  }

  await pool.query(
    `UPDATE users SET plan_tier = 'free', billing_subscription_status = 'cancelled', billing_subscription_id = NULL, updated_at = now() WHERE id = $1::uuid`,
    [userId]
  );
  return res.json({ ok: true, plan_tier: "free" });
});

billingRoutes.get("/me/usage", async (req, res) => {
  const userId = req.internalUser!.id;
  const row = await getUserBillingRow(userId);
  if (!row) {
    jsonError(res, 404, "NOT_FOUND", "User not found");
    return;
  }

  const period = new Date().toISOString().slice(0, 7);
  try {
    const { tier, counts } = await loadMonthlyUsage(pool, userId);
    return res.json(buildUsageJsonResponse(tier, counts, period));
  } catch (e) {
    req.log?.error({ err: e }, "me_usage");
    return res.status(500).json({ error: "INTERNAL", message: "Could not load usage" });
  }
});

export function verifyRazorpayWebhookSignature(req: Request): boolean {
  const buf = req.rawBody;
  if (!buf || !config.razorpayWebhookSecret) return false;
  const sig = req.headers["x-razorpay-signature"];
  if (typeof sig !== "string") return false;
  const expected = crypto.createHmac("sha256", config.razorpayWebhookSecret).update(buf).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

function subscriptionEntityFromPayload(p: Record<string, unknown>): {
  id?: string;
  notes?: Record<string, string>;
} | undefined {
  const sub = p.subscription as { entity?: { id?: string; notes?: Record<string, string> }; id?: string; notes?: Record<string, string> } | undefined;
  if (sub?.entity) return sub.entity;
  if (sub?.id) return sub as { id?: string; notes?: Record<string, string> };
  return undefined;
}

async function subscriptionUserPairFromPayload(
  p: Record<string, unknown>
): Promise<{ userId: string; subId: string } | null> {
  const sub = subscriptionEntityFromPayload(p);
  const subId = sub?.id;
  if (!subId) return null;
  let userId = sub?.notes?.followup_user_id;
  if (!userId) {
    const r = await pool.query<{ id: string }>(
      `SELECT id::text FROM users WHERE billing_subscription_id = $1 LIMIT 1`,
      [subId]
    );
    userId = r.rows[0]?.id;
  }
  if (!userId) return null;
  return { userId, subId };
}

export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  if (!verifyRazorpayWebhookSignature(req)) {
    jsonError(res, 400, "WEBHOOK_SIGNATURE_INVALID", "Invalid or missing Razorpay webhook signature");
    return;
  }

  let payload: { event?: string; payload?: Record<string, unknown> };
  try {
    payload = JSON.parse((req.rawBody ?? Buffer.alloc(0)).toString("utf8")) as {
      event?: string;
      payload?: Record<string, unknown>;
    };
  } catch {
    jsonError(res, 400, "WEBHOOK_INVALID_JSON", "Webhook body is not valid JSON");
    return;
  }

  const event = payload.event;
  const p = (payload.payload ?? {}) as Record<string, unknown>;

  try {
    if (event === "subscription.activated" || event === "subscription.charged") {
      const pair = await subscriptionUserPairFromPayload(p);
      if (pair) {
        const sub = subscriptionEntityFromPayload(p);
        const planNote = sub?.notes?.plan;
        const planTier = planNote === "pro_plus" ? "pro_plus" : "pro";
        await pool.query(
          `UPDATE users SET billing_subscription_id = $2, billing_subscription_status = 'active', plan_tier = $3, updated_at = now() WHERE id = $1::uuid`,
          [pair.userId, pair.subId, planTier]
        );
      }
    }

    if (event === "subscription.pending") {
      const pair = await subscriptionUserPairFromPayload(p);
      if (pair) {
        await pool.query(
          `UPDATE users SET billing_subscription_id = $2, billing_subscription_status = 'pending', updated_at = now() WHERE id = $1::uuid`,
          [pair.userId, pair.subId]
        );
      }
    }

    if (event === "subscription.paused" || event === "subscription.halted") {
      const pair = await subscriptionUserPairFromPayload(p);
      if (pair) {
        const st = event === "subscription.paused" ? "paused" : "halted";
        await pool.query(
          `UPDATE users SET billing_subscription_status = $2, updated_at = now() WHERE id = $1::uuid`,
          [pair.userId, st]
        );
      }
    }

    if (event === "subscription.resumed") {
      const pair = await subscriptionUserPairFromPayload(p);
      if (pair) {
        await pool.query(
          `UPDATE users SET billing_subscription_status = 'active', updated_at = now() WHERE id = $1::uuid`,
          [pair.userId]
        );
      }
    }

    if (event === "invoice.paid" || event === "invoice.payment_succeeded") {
      const inv = (p.invoice as { entity?: Record<string, unknown> } | undefined)?.entity ?? (p.invoice as Record<string, unknown> | undefined);
      const invObj = inv as
        | {
            id?: string;
            amount?: number;
            currency?: string;
            invoice_url?: string;
            short_url?: string;
            customer_id?: string;
          }
        | undefined;
      if (invObj?.id && invObj.customer_id) {
        const u = await pool.query<{ id: string }>(
          `SELECT id::text FROM users WHERE razorpay_customer_id = $1 LIMIT 1`,
          [invObj.customer_id]
        );
        const uid = u.rows[0]?.id;
        if (uid) {
          const amountPaise = Math.round(invObj.amount ?? 0);
          await pool.query(
            `INSERT INTO billing_invoices (user_id, razorpay_invoice_id, amount_cents, currency, status, pdf_url, host_invoice_url, short_url, issued_at)
             VALUES ($1::uuid, $2, $3, $4, 'paid', $5, $6, $7, now())
             ON CONFLICT (razorpay_invoice_id) DO UPDATE SET
               status = 'paid', pdf_url = COALESCE(EXCLUDED.pdf_url, billing_invoices.pdf_url), updated_at = now()`,
            [
              uid,
              invObj.id,
              amountPaise,
              (invObj.currency || "INR").toUpperCase(),
              invObj.invoice_url ?? null,
              invObj.invoice_url ?? null,
              invObj.short_url ?? null,
            ]
          );
        }
      }
    }

    if (event === "payment.captured" || event === "invoice.paid") {
      const pay = (p.payment as { entity?: Record<string, unknown> } | undefined)?.entity ?? (p.payment as Record<string, unknown> | undefined);
      const payObj = pay as
        | {
            token_id?: string;
            customer_id?: string;
            card?: { last4?: string; network?: string };
            method?: string;
          }
        | undefined;
      if (payObj?.token_id && payObj.customer_id) {
        const u = await pool.query<{ id: string }>(
          `SELECT id::text FROM users WHERE razorpay_customer_id = $1 LIMIT 1`,
          [payObj.customer_id]
        );
        const uid = u.rows[0]?.id;
        if (uid) {
          const dup = await pool.query(`SELECT id FROM billing_payment_methods WHERE user_id = $1::uuid AND razorpay_token_id = $2`, [
            uid,
            payObj.token_id,
          ]);
          if (!dup.rowCount) {
            await pool.query(`UPDATE billing_payment_methods SET is_default = false WHERE user_id = $1::uuid`, [uid]);
            await pool.query(
              `INSERT INTO billing_payment_methods (user_id, razorpay_token_id, method, last4, brand, network, is_default)
               VALUES ($1::uuid, $2, $3, $4, $5, $6, true)`,
              [
                uid,
                payObj.token_id,
                payObj.method || "card",
                payObj.card?.last4 ?? "",
                payObj.card?.network ?? "card",
                payObj.card?.network ?? "",
              ]
            );
          }
        }
      }
    }

    if (event === "subscription.cancelled" || event === "subscription.completed") {
      const pair = await subscriptionUserPairFromPayload(p);
      if (pair) {
        await pool.query(
          `UPDATE users SET billing_subscription_status = $2, plan_tier = 'free', billing_subscription_id = NULL, updated_at = now() WHERE id = $1::uuid`,
          [pair.userId, event === "subscription.completed" ? "completed" : "cancelled"]
        );
      }
    }
    res.json({ ok: true });
  } catch (e) {
    req.log?.error({ err: e }, "billing_webhook_handler");
    res.status(500).json({
      error: "WEBHOOK_HANDLER_FAILED",
      message: "Could not process webhook; retry may be attempted by the provider",
    });
  }
}
