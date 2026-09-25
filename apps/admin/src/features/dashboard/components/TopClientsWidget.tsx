import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { DashboardOverview } from "../dashboard.types";
import { formatCompactInr, formatRelativeTime } from "../dashboard.utils";
import { DashboardCard } from "./DashboardCard";

type Props = { data?: DashboardOverview; isLoading?: boolean };

export function TopClientsWidget({ data, isLoading }: Props) {
  const clients = data?.client_health ?? [];

  if (isLoading) {
    return <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />;
  }

  if (clients.length === 0) {
    return (
      <DashboardCard title="Top clients">
        <p className="text-sm text-muted-foreground py-4 text-center">Client relationships will appear here.</p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title="Top clients" description="Revenue and relationship health">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {clients.map((c) => (
          <Link
            key={c.id}
            to={`/clients/${c.id}`}
            className="rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all bg-background"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="font-semibold text-sm truncate">{c.name}</p>
              {c.invoice_overdue && <Badge variant="destructive" className="text-[9px] shrink-0">Overdue</Badge>}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Revenue</dt>
                <dd className="font-semibold tabular-nums">{formatCompactInr(c.revenue_cents)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Projects</dt>
                <dd className="font-semibold">{c.project_count}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Outstanding</dt>
                <dd className="font-semibold tabular-nums">{c.outstanding_cents > 0 ? formatCompactInr(c.outstanding_cents) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last contact</dt>
                <dd>{c.last_contact_at ? formatRelativeTime(c.last_contact_at) : "—"}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Health</span>
                <span className="font-medium">{c.health_pct}%</span>
              </div>
              <Progress value={c.health_pct} className="h-1.5" />
            </div>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
