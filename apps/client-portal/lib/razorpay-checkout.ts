/** Razorpay Standard Checkout helpers (client portal). KEY_SECRET stays on the API only. */

export type RazorpayOrder = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
};

export type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, cb: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

export function razorpayPublicKey(fallbackKeyId?: string): string {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    fallbackKeyId?.trim() ||
    ""
  );
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-rzp="1"]');
    if (existing) {
      const timer = window.setInterval(() => {
        if (window.Razorpay) {
          window.clearInterval(timer);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(timer);
        if (window.Razorpay) resolve();
        else reject(new Error("Razorpay checkout timed out"));
      }, 8000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.rzp = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load payment gateway"));
    document.body.appendChild(script);
  });
}

type OpenCheckoutInput = {
  order: RazorpayOrder;
  name?: string;
  description?: string;
  onSuccess: (payload: RazorpaySuccessPayload) => void | Promise<void>;
  onError?: (message: string) => void;
  onCancel?: () => void;
};

/** Opens Razorpay Standard Checkout modal for a server-created order. */
export async function openRazorpayCheckout(input: OpenCheckoutInput): Promise<void> {
  await loadRazorpayScript();
  const Rzp = window.Razorpay;
  if (!Rzp) throw new Error("Payment gateway unavailable");

  const key = razorpayPublicKey(input.order.key_id);
  if (!key) throw new Error("Payment gateway is not configured");

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const rzp = new Rzp({
      key,
      amount: input.order.amount,
      currency: input.order.currency,
      order_id: input.order.order_id,
      name: input.name ?? "Curvvtech",
      description: input.description ?? "Invoice payment",
      handler: (response: RazorpaySuccessPayload) => {
        void Promise.resolve(input.onSuccess(response))
          .then(() => finish(resolve))
          .catch((err) => {
            const msg = err instanceof Error ? err.message : "Payment verification failed";
            input.onError?.(msg);
            finish(() => reject(new Error(msg)));
          });
      },
      theme: { color: "#111111" },
      modal: {
        ondismiss: () => {
          input.onCancel?.();
          finish(() => reject(new Error("Payment cancelled")));
        },
      },
    });

    rzp.on("payment.failed", (response) => {
      const msg = response.error?.description ?? "Payment failed";
      input.onError?.(msg);
      finish(() => reject(new Error(msg)));
    });

    rzp.open();
  });
}
