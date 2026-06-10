import axios from "axios";
import { api } from "./api";

export type BillingSummary = {
  plan_tier: string;
  razorpay_key_id: string | null;
  billing_subscription_id: string | null;
  billing_subscription_status: string;
  razorpay_customer_id: string | null;
  has_razorpay: boolean;
  payment_methods: {
    id: string;
    method: string;
    last4: string;
    brand: string;
    network: string;
    is_default: boolean;
    created_at: string;
  }[];
  payment_required: boolean;
  paid_subscription_active: boolean;
};

export type BillingPlansResponse = {
  plans: {
    id: string;
    name: string;
    price_inr_month?: number;
    razorpay_plan_ids?: { monthly: string | null; annual: string | null };
  }[];
};

export type BillingInvoiceRow = {
  id: string;
  razorpay_invoice_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  pdf_url: string | null;
  host_invoice_url: string | null;
  short_url: string | null;
  issued_at: string | null;
};

export type UsageResponse = {
  period: string;
  plan_tier: string;
  limits: Record<string, unknown>;
  used: { leads: number; ai_assistant_messages: number; follow_up_messages: number };
  remaining: {
    leads: number | null;
    ai_assistant_messages: number | null;
    follow_up_automations: number | null;
  };
};

function errMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as { error?: string; message?: string } | undefined;
    if (d?.message) return d.message;
    if (d?.error) return d.error;
    return e.message || "Request failed";
  }
  return e instanceof Error ? e.message : "Request failed";
}

export async function fetchBillingSummary(): Promise<BillingSummary> {
  const { data } = await api.get<BillingSummary>("/v1/me/billing/summary");
  return data;
}

export async function fetchBillingPlans(): Promise<BillingPlansResponse> {
  const { data } = await api.get<BillingPlansResponse>("/v1/me/billing/plans");
  return data;
}

export async function fetchInvoices(): Promise<BillingInvoiceRow[]> {
  const { data } = await api.get<{ invoices?: BillingInvoiceRow[] }>("/v1/me/billing/invoices");
  return data.invoices ?? [];
}

export async function fetchUsage(): Promise<UsageResponse> {
  const { data } = await api.get<UsageResponse>("/v1/me/usage");
  return data;
}

export async function postSubscribe(plan: "pro" | "pro_plus", interval: "monthly" | "annual") {
  try {
    const { data } = await api.post<{
      subscription_id: string;
      short_url?: string;
      status: string;
      key_id?: string;
    }>("/v1/me/billing/subscribe", { plan, interval });
    return data;
  } catch (e) {
    throw new Error(errMessage(e));
  }
}

export async function postDowngrade() {
  try {
    await api.post("/v1/me/billing/downgrade", {});
  } catch (e) {
    throw new Error(errMessage(e));
  }
}

export async function patchDefaultPaymentMethod(id: string) {
  try {
    await api.patch(`/v1/me/billing/payment-methods/${id}/default`, {});
  } catch (e) {
    throw new Error(errMessage(e));
  }
}

export async function deletePaymentMethod(id: string) {
  try {
    await api.delete(`/v1/me/billing/payment-methods/${id}`);
  } catch (e) {
    throw new Error(errMessage(e));
  }
}
