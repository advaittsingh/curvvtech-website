import { authHeaders, getApiOrigin, parseApiError } from '#lib/followup-api'

export type BillingSummary = {
  plan_tier: string
  razorpay_key_id: string | null
  billing_subscription_id: string | null
  billing_subscription_status: string
  razorpay_customer_id: string | null
  has_razorpay: boolean
  payment_methods: {
    id: string
    method: string
    last4: string
    brand: string
    network: string
    is_default: boolean
    created_at: string
  }[]
  /** No saved payment method — user should add one (at least one must remain on file). */
  payment_required: boolean
  paid_subscription_active: boolean
}

export type BillingPlansResponse = {
  plans: {
    id: string
    name: string
    price_inr_month?: number
    razorpay_plan_ids?: { monthly: string | null; annual: string | null }
  }[]
}

export async function fetchBillingSummary(): Promise<BillingSummary | null> {
  const base = getApiOrigin()
  if (!base) return null
  const res = await fetch(`${base}/api/v1/me/billing/summary`, { headers: authHeaders() })
  if (!res.ok) return null
  return (await res.json()) as BillingSummary
}

export async function fetchBillingPlans(): Promise<BillingPlansResponse | null> {
  const base = getApiOrigin()
  if (!base) return null
  const res = await fetch(`${base}/api/v1/me/billing/plans`, { headers: authHeaders() })
  if (!res.ok) return null
  return (await res.json()) as BillingPlansResponse
}

export async function postSubscribe(plan: 'pro' | 'pro_plus', interval: 'monthly' | 'annual') {
  const base = getApiOrigin()
  if (!base) throw new Error('No API URL')
  const res = await fetch(`${base}/api/v1/me/billing/subscribe`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ plan, interval }),
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(parseApiError(data) || 'Subscribe failed')
  return data as {
    subscription_id: string
    short_url?: string
    status: string
    key_id?: string
  }
}

export async function postDowngrade() {
  const base = getApiOrigin()
  if (!base) throw new Error('No API URL')
  const res = await fetch(`${base}/api/v1/me/billing/downgrade`, {
    method: 'POST',
    headers: authHeaders(),
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(parseApiError(data) || 'Downgrade failed')
}

export async function fetchInvoices() {
  const base = getApiOrigin()
  if (!base) return []
  const res = await fetch(`${base}/api/v1/me/billing/invoices`, { headers: authHeaders() })
  if (!res.ok) return []
  const j = (await res.json()) as { invoices?: unknown[] }
  return j.invoices ?? []
}

export async function postCardSetupOrder() {
  const base = getApiOrigin()
  if (!base) throw new Error('No API URL')
  const res = await fetch(`${base}/api/v1/me/billing/orders/card-setup`, {
    method: 'POST',
    headers: authHeaders(),
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(parseApiError(data) || 'Could not create order')
  return data as {
    order_id: string
    amount: number
    currency: string
    key_id: string
    customer_id: string
    name: string
    email: string
  }
}

export async function postVerifyPayment(payload: {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}) {
  const base = getApiOrigin()
  if (!base) throw new Error('No API URL')
  const res = await fetch(`${base}/api/v1/me/billing/payments/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(parseApiError(data) || 'Verification failed')
}

export async function patchDefaultPaymentMethod(id: string) {
  const base = getApiOrigin()
  if (!base) throw new Error('No API URL')
  const res = await fetch(`${base}/api/v1/me/billing/payment-methods/${id}/default`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(parseApiError(data) || 'Update failed')
}

export async function deletePaymentMethod(id: string) {
  const base = getApiOrigin()
  if (!base) throw new Error('No API URL')
  const res = await fetch(`${base}/api/v1/me/billing/payment-methods/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(parseApiError(data) || 'Could not remove')
}

export type UsageResponse = {
  period: string
  plan_tier: string
  limits: Record<string, unknown>
  used: { leads: number; ai_assistant_messages: number; follow_up_messages: number }
  remaining: {
    leads: number | null
    ai_assistant_messages: number | null
    follow_up_automations: number | null
  }
}

export async function fetchUsage(): Promise<UsageResponse | null> {
  const base = getApiOrigin()
  if (!base) return null
  const res = await fetch(`${base}/api/v1/me/usage`, { headers: authHeaders() })
  if (!res.ok) return null
  return (await res.json()) as UsageResponse
}
