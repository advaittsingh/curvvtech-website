export type CreateOrderResponse = {
  order_id: string;
  amount: number;
  currency: string;
  key_id?: string;
};

export type VerifyPaymentResponse = {
  success: boolean;
  order_id: string;
  payment_id: string;
};

function apiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
    "";
  if (!base) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }
  return base;
}

export function razorpayKeyId(fallback?: string): string {
  const key =
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    fallback?.trim() ||
    "";
  if (!key) {
    throw new Error("NEXT_PUBLIC_RAZORPAY_KEY_ID is not configured");
  }
  return key;
}

export async function createRazorpayOrder(input: {
  amount: number;
  currency?: string;
  receipt?: string;
}): Promise<CreateOrderResponse> {
  const res = await fetch(`${apiBase()}/api/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.message || data.error || `Could not create order (${res.status})`);
  }
  return data as CreateOrderResponse;
}

export async function verifyRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<VerifyPaymentResponse> {
  const res = await fetch(`${apiBase()}/api/verify-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.message || data.error || `Payment verification failed (${res.status})`);
  }
  return data as VerifyPaymentResponse;
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
        else reject(new Error("Razorpay script timeout"));
      }, 5000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.rzp = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });
}
