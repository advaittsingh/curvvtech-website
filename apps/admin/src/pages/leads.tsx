import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/session";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  in_discussion: "bg-purple-100 text-purple-800",
  closed: "bg-stone-100 text-stone-600",
};

export default function Leads() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).leads.list();
    },
  });

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <h2 className="text-lg font-semibold text-stone-900 mb-6">Leads</h2>
      {isLoading && <p className="text-stone-500">Loading…</p>}
      <BackendErrorAlert error={error} />
      {error && <p className="text-red-600">Failed to load leads.</p>}
      {data && (
        <Card className="border-stone-200">
          <CardHeader className="border-b border-stone-200">
            <CardTitle className="text-base">Unified inbox</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {Array.isArray(data) && data.length === 0 && (
              <p className="text-stone-500">No leads yet.</p>
            )}
            {Array.isArray(data) && data.length > 0 && (
              <ul className="space-y-3">
                {data.map((l: { id: string; email?: string; name?: string; status?: string; source?: string; created_at?: string }) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 py-3 border-b border-stone-100 last:border-0">
                    <span className="font-medium text-stone-800">{l.name ?? l.email ?? "—"}</span>
                    {l.email && <span className="text-stone-500 text-sm">{l.email}</span>}
                    {l.status && (
                      <Badge className={statusColors[l.status] ?? "bg-stone-100 text-stone-600"}>
                        {l.status.replace("_", " ")}
                      </Badge>
                    )}
                    {l.source && <span className="text-stone-400 text-xs">{l.source}</span>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
