import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/session";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { toast } from "@/hooks/use-toast";

type DemoRequest = {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  date: string;
  time: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

function formatWhenShort(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DemoRequests() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "demo-requests"],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).demoRequests.list();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = getAccessToken();
      return adminApi(token).demoRequests.updateStatus(id, status);
    },
    onSuccess: (_, { status }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "demo-requests"] });
      if (status === "confirmed") {
        toast({
          title: "Confirmed",
          description: "The guest receives a calendar invite by email.",
        });
      }
    },
    onError: (e: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: e.message,
      });
    },
  });

  const list = Array.isArray(data) ? (data as DemoRequest[]) : [];
  const apiError = data && typeof data === "object" && "error" in data ? (data as { error: string }).error : null;

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <p className="text-sm text-stone-500 mb-4 max-w-2xl">
        Full booking details from the FollowUp demo form. <strong>Confirm</strong> marks the request confirmed and sends a
        calendar invite to the guest from{" "}
        <span className="font-mono text-stone-800">advaitsingh@curvvtech.in</span>.
      </p>
      {isLoading && <p className="text-stone-500">Loading…</p>}
      <BackendErrorAlert error={error} />
      {error && <p className="text-red-600">Failed to load demo requests.</p>}
      {apiError && <p className="text-red-600">{apiError}</p>}
      {!isLoading && !error && !apiError && (
        <Card className="border-stone-200">
          <CardHeader className="border-b border-stone-200">
            <CardTitle className="text-base">Booked demos</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {list.length === 0 ? (
              <p className="text-stone-500">No demo bookings yet.</p>
            ) : (
              <>
                {/* Mobile: stacked cards — no horizontal scroll */}
                <ul className="space-y-3 md:hidden">
                  {list.map((r) => (
                    <li key={r.id} className="rounded-lg border border-stone-200 p-3 text-sm">
                      <div className="font-medium text-stone-900">{r.name ?? "—"}</div>
                      <div className="text-xs text-stone-500 truncate">
                        <a href={`mailto:${r.email}`} className="text-blue-700 hover:underline">
                          {r.email}
                        </a>
                      </div>
                      {(r.company?.trim() || r.phone?.trim()) && (
                        <div className="text-xs text-stone-500 mt-1">
                          {[r.company?.trim(), r.phone?.trim()].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      <div className="text-xs text-stone-600 mt-2">
                        {r.date} {r.time} IST · Booked {formatWhenShort(r.created_at)}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-3">
                        <Badge variant="secondary">{r.status ?? "pending"}</Badge>
                        <div className="flex gap-2 shrink-0">
                          {r.status !== "confirmed" && r.status !== "completed" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updateStatus.isPending}
                              onClick={() => updateStatus.mutate({ id: r.id, status: "confirmed" })}
                            >
                              Confirm
                            </Button>
                          ) : null}
                          {r.status !== "completed" ? (
                            <Button
                              size="sm"
                              variant="default"
                              disabled={updateStatus.isPending}
                              onClick={() => updateStatus.mutate({ id: r.id, status: "completed" })}
                            >
                              Complete
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* md+: fixed table — fits typical laptop widths without x-scroll */}
                <div className="hidden md:block w-full">
                  <table className="w-full text-xs table-fixed border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 text-left text-stone-600">
                        <th className="py-2 pr-2 font-medium w-[32%]">Guest</th>
                        <th className="py-2 pr-2 font-medium w-[14%]">Phone</th>
                        <th className="py-2 pr-2 font-medium w-[16%]">Slot (IST)</th>
                        <th className="py-2 pr-2 font-medium w-[14%]">Booked</th>
                        <th className="py-2 pr-2 font-medium w-[10%]">Status</th>
                        <th className="py-2 pl-2 font-medium text-right w-[14%]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        <tr key={r.id} className="border-b border-stone-100 last:border-0 align-top">
                          <td className="py-2 pr-2 min-w-0">
                            <div className="font-medium text-stone-800 truncate" title={r.id}>
                              {r.name ?? "—"}
                            </div>
                            <div className="truncate text-stone-500">
                              <a href={`mailto:${r.email}`} className="text-blue-700 hover:underline">
                                {r.email ?? "—"}
                              </a>
                            </div>
                            {r.company?.trim() ? (
                              <div className="text-stone-400 truncate text-[11px]">{r.company}</div>
                            ) : null}
                          </td>
                          <td className="py-2 pr-2 text-stone-600 truncate" title={r.phone ?? ""}>
                            {r.phone?.trim() || "—"}
                          </td>
                          <td className="py-2 pr-2 text-stone-700 whitespace-nowrap">
                            {r.date} {r.time}
                          </td>
                          <td className="py-2 pr-2 text-stone-600">{formatWhenShort(r.created_at)}</td>
                          <td className="py-2 pr-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {r.status ?? "pending"}
                            </Badge>
                          </td>
                          <td className="py-2 pl-2 text-right">
                            <div className="flex flex-col gap-1 items-end">
                              {r.status !== "confirmed" && r.status !== "completed" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  disabled={updateStatus.isPending}
                                  onClick={() => updateStatus.mutate({ id: r.id, status: "confirmed" })}
                                >
                                  Confirm
                                </Button>
                              ) : null}
                              {r.status !== "completed" ? (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs px-2"
                                  disabled={updateStatus.isPending}
                                  onClick={() => updateStatus.mutate({ id: r.id, status: "completed" })}
                                >
                                  Complete
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
