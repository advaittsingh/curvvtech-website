import { fetchWithAuth } from '#lib/fetch-with-auth'
import { getApiOrigin, parseApiError, v1ApiPath } from '#lib/followup-api'

const jsonHeaders = { 'Content-Type': 'application/json' }

async function readErrorBody(res: Response): Promise<Record<string, unknown>> {
  const t = await res.text()
  if (!t) return {}
  try {
    return JSON.parse(t) as Record<string, unknown>
  } catch {
    return {}
  }
}

export type ApiOk<T> = { ok: true; data: T }
export type ApiErr = { ok: false; status: number; message: string }
export type ApiResult<T> = ApiOk<T> | ApiErr

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

export type BillingInvoiceRow = {
  id: string
  razorpay_invoice_id: string
  amount_cents: number
  currency: string
  status: string
  pdf_url: string | null
  host_invoice_url: string | null
  short_url: string | null
  issued_at: string | null
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

function unconfigured(): ApiErr {
  return { ok: false, status: 0, message: 'App is not configured (NEXT_PUBLIC_API_URL).' }
}

export async function fetchBillingSummary(): Promise<ApiResult<BillingSummary>> {
  if (!getApiOrigin()) return unconfigured()
  const res = await fetchWithAuth(v1ApiPath('me/billing/summary'), { headers: jsonHeaders })
  if (!res.ok) {
    const data = await readErrorBody(res)
    return {
      ok: false,
      status: res.status,
      message: parseApiError(data) || `Could not load billing (${res.status})`,
    }
  }
  return { ok: true, data: (await res.json()) as BillingSummary }
}

export async function fetchBillingPlans(): Promise<ApiResult<BillingPlansResponse>> {
  if (!getApiOrigin()) return unconfigured()
  const res = await fetchWithAuth(v1ApiPath('me/billing/plans'), { headers: jsonHeaders })
  if (!res.ok) {
    const data = await readErrorBody(res)
    return {
      ok: false,
      status: res.status,
      message: parseApiError(data) || `Could not load plans (${res.status})`,
    }
  }
  return { ok: true, data: (await res.json()) as BillingPlansResponse }
}

export async function fetchInvoices(): Promise<ApiResult<BillingInvoiceRow[]>> {
  if (!getApiOrigin()) return unconfigured()
  const res = await fetchWithAuth(v1ApiPath('me/billing/invoices'), { headers: jsonHeaders })
  if (!res.ok) {
    const data = await readErrorBody(res)
    return {
      ok: false,
      status: res.status,
      message: parseApiError(data) || `Could not load invoices (${res.status})`,
    }
  }
  const j = (await res.json()) as { invoices?: BillingInvoiceRow[] }
  return { ok: true, data: j.invoices ?? [] }
}

export async function fetchUsage(): Promise<ApiResult<UsageResponse>> {
  if (!getApiOrigin()) return unconfigured()
  const res = await fetchWithAuth(v1ApiPath('me/usage'), { headers: jsonHeaders })
  if (!res.ok) {
    const data = await readErrorBody(res)
    return {
      ok: false,
      status: res.status,
      message: parseApiError(data) || `Could not load usage (${res.status})`,
    }
  }
  return { ok: true, data: (await res.json()) as UsageResponse }
}

export async function postSubscribe(plan: 'pro' | 'pro_plus', interval: 'monthly' | 'annual') {
  if (!getApiOrigin()) throw new Error('No API URL')
  const res = await fetchWithAuth(v1ApiPath('me/billing/subscribe'), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ plan, interval }),
  })
  if (!res.ok) {
    const data = await readErrorBody(res)
    throw new Error(parseApiError(data) || 'Subscribe failed')
  }
  return (await res.json()) as {
    subscription_id: string
    short_url?: string
    status: string
    key_id?: string
  }
}

export async function postDowngrade() {
  if (!getApiOrigin()) throw new Error('No API URL')
  const res = await fetchWithAuth(v1ApiPath('me/billing/downgrade'), {
    method: 'POST',
    headers: jsonHeaders,
  })
  if (!res.ok) {
    const data = await readErrorBody(res)
    throw new Error(parseApiError(data) || 'Downgrade failed')
  }
}

export async function postCardSetupOrder() {
  if (!getApiOrigin()) throw new Error('No API URL')
  const res = await fetchWithAuth(v1ApiPath('me/billing/orders/card-setup'), {
    method: 'POST',
    headers: jsonHeaders,
  })
  if (!res.ok) {
    const data = await readErrorBody(res)
    throw new Error(parseApiError(data) || 'Could not create order')
  }
  return (await res.json()) as {
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
  if (!getApiOrigin()) throw new Error('No API URL')
  const res = await fetchWithAuth(v1ApiPath('me/billing/payments/verify'), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  const data = (await readErrorBody(res)) as Record<string, unknown>
  if (!res.ok) throw new Error(parseApiError(data) || 'Verification failed')
}

export async function patchDefaultPaymentMethod(id: string) {
  if (!getApiOrigin()) throw new Error('No API URL')
  const res = await fetchWithAuth(v1ApiPath(`me/billing/payment-methods/${id}/default`), {
    method: 'PATCH',
    headers: jsonHeaders,
  })
  const data = (await readErrorBody(res)) as Record<string, unknown>
  if (!res.ok) throw new Error(parseApiError(data) || 'Update failed')
}

export async function deletePaymentMethod(id: string) {
  if (!getApiOrigin()) throw new Error('No API URL')
  const res = await fetchWithAuth(v1ApiPath(`me/billing/payment-methods/${id}`), {
    method: 'DELETE',
    headers: jsonHeaders,
  })
  const data = (await readErrorBody(res)) as Record<string, unknown>
  if (!res.ok) throw new Error(parseApiError(data) || 'Could not remove')
}
