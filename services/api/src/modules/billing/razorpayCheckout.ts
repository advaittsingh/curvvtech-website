import crypto from "node:crypto";
import { config } from "../../config.js";
import { getRazorpay, razorpayConfigured } from "./razorpayClient.js";

export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!config.razorpayKeySecret) return false;
  const expected = crypto
    .createHmac("sha256", config.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

type RazorpayApiError = {
  statusCode?: number;
  error?: { code?: string; description?: string };
};

export function razorpayErrorStatus(err: unknown): { status: number; message: string } {
  const e = err as RazorpayApiError;
  const status = e.statusCode ?? 500;
  const message = e.error?.description || "Razorpay request failed";
  if (status === 401 || e.error?.code === "BAD_REQUEST_ERROR" && /auth/i.test(message)) {
    return { status: 401, message: "Razorpay authentication failed" };
  }
  if (status === 401) {
    return { status: 401, message: "Razorpay authentication failed" };
  }
  return { status: 500, message };
}

export async function createRazorpayOrder(input: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<{ order_id: string; amount: number; currency: string; key_id: string }> {
  if (!razorpayConfigured()) {
    throw Object.assign(new Error("Razorpay is not configured"), { code: "NOT_CONFIGURED" });
  }

  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount < 100) {
    throw Object.assign(new Error("Amount must be at least 100 paise"), { code: "INVALID_AMOUNT" });
  }

  const currency = (input.currency || "INR").toUpperCase();
  const receipt = input.receipt || `rcpt_${Date.now()}`;

  const rz = getRazorpay()!;
  const order = (await (rz.orders as unknown as {
    create: (p: Record<string, unknown>) => Promise<{ id: string; amount: number; currency: string }>;
  }).create({
    amount,
    currency,
    receipt,
    notes: input.notes,
  })) as { id: string; amount: number; currency: string };

  return {
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: config.razorpayKeyId,
  };
}
