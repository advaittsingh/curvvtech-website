import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/session";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}

export default function Analytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "analytics", "revenue"],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).analytics.revenue();
    },
  });

  const apiError = data && typeof data === "object" && "error" in data ? (data as { error: string }).error : null;
  const rev = data && typeof data === "object" && !("error" in data) ? data as {
    paid_revenue_cents?: number;
    invoices_paid?: number;
    invoices_sent?: number;
    invoices_draft?: number;
    active_subscriptions?: number;
  } : null;

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <h2 className="text-lg font-semibold text-stone-900 mb-6">Analytics</h2>
      {isLoading && <p className="text-stone-500">Loading…</p>}
      <BackendErrorAlert error={error} />
      {error && <p className="text-red-600">Failed to load analytics.</p>}
      {apiError && <p className="text-red-600">{apiError}</p>}
      {rev && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-stone-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Revenue (paid)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-stone-900">{formatCents(rev.paid_revenue_cents ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-stone-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Invoices paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-stone-900">{rev.invoices_paid ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border-stone-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Invoices sent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-stone-900">{rev.invoices_sent ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border-stone-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Active subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-stone-900">{rev.active_subscriptions ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}
      {rev && (
        <Card className="border-stone-200 mt-6">
          <CardHeader className="border-b border-stone-200">
            <CardTitle className="text-base">Revenue & SaaS metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-stone-500 text-sm">
              Data is read from your database. Connect Stripe webhooks to sync products and subscriptions for MRR and churn later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
