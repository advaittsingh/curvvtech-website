/** Loaded from https://checkout.razorpay.com/v1/checkout.js */
interface RazorpayConstructor {
  new (options: Record<string, unknown>): { open: () => void; on: (event: string, fn: (err: unknown) => void) => void }
}

interface Window {
  Razorpay?: RazorpayConstructor
}
