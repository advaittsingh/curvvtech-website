import { FolderKanban, IndianRupee, Receipt, TrendingUp } from "lucide-react";
import type { DashboardOverview } from "../dashboard.types";
import { formatCompactInr, formatInr } from "../dashboard.utils";
import { KpiMetricCard } from "./KpiMetricCard";

type Props = { data?: DashboardOverview; isLoading?: boolean };

export function ExecutiveKpiCards({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const yesterday = data.revenue?.paid_yesterday_cents ?? 0;
  const pipeline = data.pipeline ?? {
    pipeline_value_cents: 0,
    booked_value_cents: 0,
    opportunities_count: 0,
    expected_close_pct: 0,
    open_leads: 0,
  };
  const projects = data.projects_summary ?? {
    active: 0,
    awaiting_client: 0,
    testing: 0,
    deploying: 0,
    average_health_pct: 0,
  };

  const hasLeads = pipeline.open_leads > 0;
  const bookedValue = pipeline.booked_value_cents ?? 0;
  const isEstimated = hasLeads && bookedValue === 0 && pipeline.pipeline_value_cents > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <KpiMetricCard
        href="/payments"
        label="Revenue today"
        value={formatInr(data.revenue.paid_today_cents)}
        numericValue={data.revenue.paid_today_cents}
        trend={`${data.revenue.paid_today_change_pct >= 0 ? "▲" : "▼"} ${Math.abs(data.revenue.paid_today_change_pct)}%`}
        trendUp={data.revenue.paid_today_change_pct >= 0}
        subtitle={`Yesterday ${formatCompactInr(yesterday)}`}
        icon={IndianRupee}
        accent="before:bg-emerald-500"
      />

      <KpiMetricCard
        href={hasLeads ? "/leads" : "/leads?action=create"}
        label="Pipeline"
        value={hasLeads ? formatCompactInr(pipeline.pipeline_value_cents) : "—"}
        numericValue={pipeline.pipeline_value_cents}
        subtitle={
          hasLeads
            ? `${pipeline.open_leads} open lead${pipeline.open_leads === 1 ? "" : "s"} · ${pipeline.expected_close_pct}% close${isEstimated ? " · estimated" : ""}`
            : "Create your first lead"
        }
        icon={TrendingUp}
        accent="before:bg-violet-500"
      />

      <KpiMetricCard
        href="/projects"
        label="Active projects"
        value={`${projects.active}`}
        numericValue={projects.active}
        subtitle={`${projects.average_health_pct}% avg health · ${projects.awaiting_client} awaiting client`}
        icon={FolderKanban}
        accent="before:bg-blue-500"
      />

      <KpiMetricCard
        href="/invoices?status=sent"
        label="Collections due"
        value={data.revenue.outstanding_cents > 0 ? formatCompactInr(data.revenue.outstanding_cents) : "Clear"}
        numericValue={data.revenue.outstanding_cents}
        subtitle={
          data.revenue.outstanding_cents > 0
            ? `${data.today_snapshot.pending_invoice_count} pending${data.today_snapshot.overdue_invoices > 0 ? ` · ${data.today_snapshot.overdue_invoices} overdue` : ""}`
            : "All invoices paid"
        }
        icon={Receipt}
        accent="before:bg-amber-500"
      />
    </div>
  );
}
