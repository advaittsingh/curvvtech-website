import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/session";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Plus } from "lucide-react";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}

const statusVariant: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700",
  sent: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
};

export default function Invoices() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "invoices"],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).invoices.list();
    },
  });

  const list = Array.isArray(data) ? data : [];
  const apiError = data && typeof data === "object" && "error" in data ? (data as { error: string }).error : null;

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-stone-900">Invoices</h2>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New invoice
        </Button>
      </div>
      {isLoading && <p className="text-stone-500">Loading…</p>}
      <BackendErrorAlert error={error} />
      {error && <p className="text-red-600">Failed to load invoices.</p>}
      {apiError && <p className="text-red-600">{apiError}</p>}
      {!isLoading && !error && !apiError && (
        <Card className="border-stone-200">
          <CardHeader className="border-b border-stone-200">
            <CardTitle className="text-base">Invoicing & billing</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {list.length === 0 ? (
              <p className="text-stone-500">No invoices yet. Create one to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-2 font-medium text-stone-600">Number</th>
                      <th className="text-left py-2 font-medium text-stone-600">Client</th>
                      <th className="text-left py-2 font-medium text-stone-600">Amount</th>
                      <th className="text-left py-2 font-medium text-stone-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((i: { id: string; invoice_number?: string; client_name?: string; amount_cents?: number; status?: string }) => (
                      <tr key={i.id} className="border-b border-stone-100 last:border-0">
                        <td className="py-3 font-medium text-stone-800">{i.invoice_number ?? "—"}</td>
                        <td className="py-3 text-stone-600">{i.client_name ?? "—"}</td>
                        <td className="py-3">{i.amount_cents != null ? formatCents(i.amount_cents) : "—"}</td>
                        <td className="py-3">
                          <Badge className={statusVariant[i.status ?? "draft"] ?? "bg-stone-100"}>{i.status ?? "draft"}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
