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

export default function Clients() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).clients.list();
    },
  });

  const list = Array.isArray(data) ? data : [];
  const apiError = data && typeof data === "object" && "error" in data ? (data as { error: string }).error : null;

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-stone-900">Clients</h2>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add client
        </Button>
      </div>
      {isLoading && <p className="text-stone-500">Loading…</p>}
      <BackendErrorAlert error={error} />
      {error && <p className="text-red-600">Failed to load clients.</p>}
      {apiError && <p className="text-red-600">{apiError}</p>}
      {!isLoading && !error && !apiError && (
        <Card className="border-stone-200">
          <CardHeader className="border-b border-stone-200">
            <CardTitle className="text-base">Client CRM</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {list.length === 0 ? (
              <p className="text-stone-500">No clients yet. Add a client to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-2 font-medium text-stone-600">Name</th>
                      <th className="text-left py-2 font-medium text-stone-600">Company</th>
                      <th className="text-left py-2 font-medium text-stone-600">Contract value</th>
                      <th className="text-left py-2 font-medium text-stone-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((c: { id: string; name?: string; company?: string; contract_value_cents?: number; status?: string }) => (
                      <tr key={c.id} className="border-b border-stone-100 last:border-0">
                        <td className="py-3 font-medium text-stone-800">{c.name ?? "—"}</td>
                        <td className="py-3 text-stone-600">{c.company ?? "—"}</td>
                        <td className="py-3">{c.contract_value_cents != null ? formatCents(c.contract_value_cents) : "—"}</td>
                        <td className="py-3">
                          <Badge variant="secondary">{c.status ?? "active"}</Badge>
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
