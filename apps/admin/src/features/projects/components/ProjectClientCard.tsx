import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Mail, Phone } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Badge } from "@/components/ui/badge";
import type { ProjectRecord, ProjectSummary } from "../project-schemas";
import { PROJECT_STATUS_LABELS } from "../project-schemas";

type Props = {
  project: ProjectRecord;
  summary?: ProjectSummary | null;
};

export function ProjectClientCard({ project, summary }: Props) {
  const api = useAdminApi();
  const { data: client } = useQuery({
    queryKey: ["admin", "clients", project.client_id],
    queryFn: () => api.clients.get(project.client_id!),
    enabled: Boolean(project.client_id),
  });

  const c = client && typeof client === "object" && !("error" in client) ? (client as Record<string, unknown>) : null;
  const portalActive = summary?.portal?.access_enabled;
  const contactName = String(c?.name ?? c?.contact_name ?? project.client_name ?? "—");
  const company = String(c?.company ?? project.client_name ?? "—");
  const email = String(c?.email ?? project.client_email ?? "—");
  const phone = String(c?.phone ?? "—");

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</h3>
      </div>
      <div>
        <p className="font-semibold leading-tight">{contactName}</p>
        <p className="text-sm text-muted-foreground">{company}</p>
      </div>
      <dl className="space-y-2 text-sm">
        <Row icon={Mail} label="Email" value={email} />
        <Row icon={Phone} label="Phone" value={phone} />
        <div className="flex justify-between gap-2 pt-1">
          <dt className="text-muted-foreground">Portal</dt>
          <dd>
            <Badge variant="outline" className={portalActive ? "bg-emerald-50 text-emerald-800 border-emerald-200" : ""}>
              {portalActive ? "Active" : "Inactive"}
            </Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Project status</dt>
          <dd>{PROJECT_STATUS_LABELS[project.status ?? "planning"] ?? project.status}</dd>
        </div>
      </dl>
      {project.client_id && (
        <Link to={`/clients/${project.client_id}`} className="text-xs text-primary hover:underline inline-block">
          View client profile →
        </Link>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="truncate" title={value}>{value}</dd>
      </div>
    </div>
  );
}
