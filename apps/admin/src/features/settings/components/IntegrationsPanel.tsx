import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [params, setParams] = useSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => api.integrations.list(),
  });

  useEffect(() => {
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) {
      toast({ title: `${PROVIDER_LABELS[connected] ?? connected} connected` });
      qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
      qc.invalidateQueries({ queryKey: ["admin", "careers", "setup"] });
      params.delete("connected");
      setParams(params, { replace: true });
    } else if (error) {
      toast({
        title: "Google connection failed",
        description: error === "oauth_failed" ? "Check GOOGLE_CLIENT_SECRET and the redirect URI in Google Cloud." : error,
        variant: "destructive",
      });
      params.delete("error");
      setParams(params, { replace: true });
    }
  }, [params, qc, setParams, toast]);

  const disconnect = useMutation({
    mutationFn: (provider: string) => api.integrations.disconnect(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
      qc.invalidateQueries({ queryKey: ["admin", "careers", "setup"] });
      toast({ title: "Disconnected" });
    },
  });

  const list = Array.isArray(data) ? data : [];

  async function connect(provider: string) {
    const res = await api.integrations.oauthUrl(provider);
    if (res.configured && res.url) {
      window.location.assign(res.url);
      return;
    }
    toast({
      title: "OAuth not configured",
      description: res.message ?? "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the API.",
      variant: "destructive",
    });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading integrations…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect Google Calendar with the hiring Google account so Careers can create Meet links when you shortlist.
        Gmail OAuth is optional; outbound mail already uses Resend.
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
              <Button variant="outline" size="sm" onClick={() => disconnect.mutate(item.provider)}>
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={() => connect(item.provider)}>
                Connect
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
