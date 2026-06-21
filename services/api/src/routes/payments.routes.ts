import { Router } from "express";
import { jsonError } from "../lib/jsonError.js";
import {
  createRazorpayOrder,
  razorpayErrorStatus,
  verifyRazorpayPaymentSignature,
} from "../modules/billing/razorpayCheckout.js";
import { razorpayConfigured } from "../modules/billing/razorpayClient.js";

const paymentsRouter = Router();

paymentsRouter.post("/create-order", async (req, res) => {
  if (!razorpayConfigured()) {
    jsonError(res, 503, "RAZORPAY_NOT_CONFIGURED", "Razorpay is not configured on the server");
    return;
  }

  const body = req.body as { amount?: unknown; currency?: string; receipt?: string };
  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount < 100) {
    jsonError(res, 400, "INVALID_AMOUNT", "amount must be a number >= 100 (paise)");
    return;
  }

  try {
    const order = await createRazorpayOrder({
      amount,
      currency: body.currency,
      receipt: body.receipt,
    });
    return res.json({
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      key_id: order.key_id,
    });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "INVALID_AMOUNT") {
      jsonError(res, 400, "INVALID_AMOUNT", e.message);
      return;
    }
    if (e.code === "NOT_CONFIGURED") {
      jsonError(res, 503, "RAZORPAY_NOT_CONFIGURED", e.message);
      return;
    }
    const { status, message } = razorpayErrorStatus(err);
    jsonError(res, status, status === 401 ? "RAZORPAY_AUTH_FAILED" : "RAZORPAY_ERROR", message);
  }
});

paymentsRouter.post("/verify-payment", (req, res) => {
  if (!razorpayConfigured()) {
    jsonError(res, 503, "RAZORPAY_NOT_CONFIGURED", "Razorpay is not configured on the server");
    return;
  }

  const body = req.body as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  const orderId = body.razorpay_order_id?.trim();
  const paymentId = body.razorpay_payment_id?.trim();
  const signature = body.razorpay_signature?.trim();

  if (!orderId || !paymentId || !signature) {
    jsonError(
      res,
      400,
      "VALIDATION_ERROR",
      "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required"
    );
    return;
  }

  if (!verifyRazorpayPaymentSignature(orderId, paymentId, signature)) {
    jsonError(res, 400, "INVALID_SIGNATURE", "Payment signature verification failed");
    return;
  }

  return res.json({
    success: true,
    order_id: orderId,
    payment_id: paymentId,
  });
});

export default paymentsRouter;
