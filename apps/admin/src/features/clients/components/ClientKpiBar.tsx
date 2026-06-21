import type { ClientSummary } from "../schemas";
import { formatInr, healthTier, healthTierColor } from "../constants";

type Props = {
  summary: ClientSummary | null;
};

export function ClientKpiBar({ summary }: Props) {
  const s = summary ?? {
    lifetime_revenue_cents: 0,
    outstanding_cents: 0,
    projects_active: 0,
    projects_completed: 0,
    invoices_pending: 0,
    health_score: 0,
    total_billed_cents: 0,
    total_received_cents: 0,
  };
  const tier = healthTier(s.health_score);

  const items = [
    { label: "Lifetime revenue", value: formatInr(s.lifetime_revenue_cents) },
    { label: "Outstanding", value: formatInr(s.outstanding_cents) },
    { label: "Projects active", value: String(s.projects_active) },
    { label: "Projects completed", value: String(s.projects_completed) },
    { label: "Invoices pending", value: String(s.invoices_pending) },
    { label: "Client health", value: `${s.health_score}/100`, highlight: true, tier },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-4 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{item.label}</p>
          <p className={`mt-1 truncate ${item.highlight ? "text-lg font-semibold" : "text-base font-semibold"}`}>
            {item.highlight ? (
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-sm ${healthTierColor(item.tier!)}`}>
                {item.value}
              </span>
            ) : (
              item.value
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
