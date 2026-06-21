import { Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProjectSummary } from "../project-schemas";
import { formatRelativeDays } from "../../clients/constants";
import { useToast } from "@/hooks/use-toast";

type Props = {
  summary: ProjectSummary | null | undefined;
  clientId?: string;
  fileCount?: number;
};

export function ProjectPortalCard({ summary, clientId, fileCount = 0 }: Props) {
  const { toast } = useToast();
  const portal = summary?.portal;
  const active = portal?.access_enabled;

  function copyLink() {
    if (!portal?.url) return;
    navigator.clipboard.writeText(portal.url);
    toast({ title: "Portal link copied" });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client portal</h3>
      <dl className="space-y-3 text-sm">
        <PortalRow label="Portal status" value={active ? "🟢 Active" : "⚪ Inactive"} />
        <PortalRow label="Client access" value={active ? "Enabled" : "Disabled"} />
        <PortalRow
          label="Last login"
          value={portal?.last_login_at ? formatRelativeDays(portal.last_login_at) : "Never"}
        />
        <PortalRow label="Projects visible" value="1" />
        <PortalRow label="Files shared" value={String(fileCount)} />
      </dl>
      <div className="flex gap-2 flex-wrap pt-1">
        {portal?.url ? (
          <Button size="sm" className="gap-1" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5" /> Copy link
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Portal link available after client invite is sent.</p>
        )}
        {clientId && (
          <Button size="sm" variant="outline" className="gap-1" asChild>
            <a href={`/clients/${clientId}`}>
              <ExternalLink className="h-3.5 w-3.5" /> Manage portal
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function PortalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 items-center">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
