import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/session";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Plus } from "lucide-react";

export default function Blogs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "blogs"],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).blogs.list();
    },
  });

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-stone-900">Blogs</h2>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New blog
        </Button>
      </div>
      {isLoading && <p className="text-stone-500">Loading…</p>}
      <BackendErrorAlert error={error} />
      {error && <p className="text-red-600">Failed to load blogs.</p>}
      {data && (data as { error?: string }).error && (
        <p className="text-red-600">{(data as { error: string }).error}</p>
      )}
      {data && !(data as { error?: string }).error && (
        <Card className="border-stone-200">
          <CardHeader className="border-b border-stone-200">
            <CardTitle className="text-base">All blogs</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {Array.isArray(data) && data.length === 0 && (
              <p className="text-stone-500">No blogs yet. Create one to get started.</p>
            )}
            {Array.isArray(data) && data.length > 0 && (
              <ul className="space-y-2">
                {data.map((b: { id: string; title?: string; slug?: string }) => (
                  <li key={b.id} className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                    <span className="font-medium text-stone-800">{b.title ?? b.slug ?? b.id}</span>
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
