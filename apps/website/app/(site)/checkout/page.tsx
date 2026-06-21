"use client";

import RazorpayCheckoutButton from "@/components/payments/RazorpayCheckoutButton";

/** Demo page for Razorpay Standard Checkout (test mode). */
export default function CheckoutPage() {
  return (
    <section className="py-20">
      <div className="container max-w-lg mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold">Secure checkout</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Pay with Razorpay test mode. Use test card{" "}
            <span className="font-mono">4111 1111 1111 1111</span>, any future expiry, and any CVV.
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span>Demo payment</span>
            <span className="font-semibold">₹1.00</span>
          </div>
          <RazorpayCheckoutButton
            amount={100}
            description="CurvvTech demo payment"
            label="Pay ₹1 (test)"
          />
        </div>
      </div>
    </section>
  );
}
