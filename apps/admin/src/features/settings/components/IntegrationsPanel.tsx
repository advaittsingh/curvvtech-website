import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  whatsapp: "WhatsApp Business",
};

export function IntegrationsPanel() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => api.integrations.list(),
  });

  const disconnect = useMutation({
    mutationFn: (provider: string) => api.integrations.disconnect(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
      toast({ title: "Disconnected" });
    },
  });

  const list = Array.isArray(data) ? data : [];

  async function connect(provider: string) {
    const res = await api.integrations.oauthUrl(provider);
    if (res.configured && res.url) {
      window.open(res.url, "_blank");
      toast({ title: "Complete OAuth in the new window" });
    } else {
      toast({
        title: "OAuth not configured",
        description: res.message ?? "Set GOOGLE_CLIENT_ID on the API server to enable this integration.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading integrations…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect Gmail, Google Calendar, and WhatsApp. OAuth requires GOOGLE_CLIENT_ID on the API server.
      </p>
      {list.map((item: { provider: string; connected: boolean }) => (
        <div key={item.provider} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="font-medium">{PROVIDER_LABELS[item.provider] ?? item.provider}</p>
            <Badge variant={item.connected ? "default" : "secondary"} className="mt-1">
              {item.connected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          <div className="flex gap-2">
            {item.connected ? (
              <Button variant="outline" size="sm" onClick={() => disconnect.mutate(item.provider)}>Disconnect</Button>
            ) : (
              <Button size="sm" onClick={() => connect(item.provider)}>Connect</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
