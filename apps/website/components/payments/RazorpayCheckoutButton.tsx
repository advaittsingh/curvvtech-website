"use client";

import { useCallback, useState } from "react";
import {
  createRazorpayOrder,
  loadRazorpayScript,
  razorpayKeyId,
  verifyRazorpayPayment,
} from "@/lib/razorpay-checkout";

type RazorpayCheckoutButtonProps = {
  /** Amount in paise (minimum 100). */
  amount: number;
  currency?: string;
  label?: string;
  description?: string;
  name?: string;
  className?: string;
  onSuccess?: (result: { order_id: string; payment_id: string }) => void;
  onError?: (message: string) => void;
  onCancel?: () => void;
};

export default function RazorpayCheckoutButton({
  amount,
  currency = "INR",
  label = "Pay now",
  description = "CurvvTech payment",
  name = "CurvvTech",
  className = "",
  onSuccess,
  onError,
  onCancel,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handlePay = useCallback(async () => {
    if (amount < 100) {
      const msg = "Minimum payment amount is ₹1 (100 paise).";
      setStatus(msg);
      onError?.(msg);
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await loadRazorpayScript();
      const order = await createRazorpayOrder({ amount, currency });
      const Rzp = window.Razorpay;
      if (!Rzp) throw new Error("Razorpay checkout is unavailable");

      const rzp = new Rzp({
        key: razorpayKeyId(order.key_id),
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name,
        description,
        handler: async (response) => {
          try {
            const verified = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setStatus("Payment successful.");
            onSuccess?.({ order_id: verified.order_id, payment_id: verified.payment_id });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Payment verification failed";
            setStatus(msg);
            onError?.(msg);
          } finally {
            setLoading(false);
          }
        },
        theme: { color: "#1B1D1E" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatus("Payment cancelled.");
            onCancel?.();
          },
        },
      });

      rzp.on("payment.failed", (response) => {
        const msg = response.error?.description || "Payment failed";
        setStatus(msg);
        onError?.(msg);
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start checkout";
      setStatus(msg);
      onError?.(msg);
      setLoading(false);
    }
  }, [amount, currency, description, name, onCancel, onError, onSuccess]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={loading}
        className={
          className ||
          "rounded-full bg-dark_black px-6 py-3 text-white font-medium disabled:opacity-60"
        }
      >
        {loading ? "Opening checkout…" : label}
      </button>
      {status ? <p className="text-sm text-neutral-600 dark:text-neutral-400">{status}</p> : null}
    </div>
  );
}
