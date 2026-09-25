import type { LucideIcon } from "lucide-react";
import { FolderKanban, HeartPulse, Package, Receipt, TrendingUp, Wallet } from "lucide-react";
import type { ClientSummary } from "../schemas";
import { formatInr, healthTier, healthTierColor } from "../constants";

type Props = {
  summary: ClientSummary | null;
};

type KpiItem = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
  highlight?: boolean;
  tier?: ReturnType<typeof healthTier>;
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

  const items: KpiItem[] = [
    {
      label: "Lifetime revenue",
      value: formatInr(s.lifetime_revenue_cents),
      icon: Wallet,
      iconClass: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Outstanding",
      value: formatInr(s.outstanding_cents),
      icon: Receipt,
      iconClass: "text-amber-600 bg-amber-50",
    },
    {
      label: "Active projects",
      value: String(s.projects_active),
      icon: Package,
      iconClass: "text-violet-600 bg-violet-50",
    },
    {
      label: "Completed",
      value: String(s.projects_completed),
      icon: FolderKanban,
      iconClass: "text-blue-600 bg-blue-50",
    },
    {
      label: "Invoices pending",
      value: String(s.invoices_pending),
      icon: TrendingUp,
      iconClass: "text-orange-600 bg-orange-50",
    },
    {
      label: "Client health",
      value: `${s.health_score}/100`,
      icon: HeartPulse,
      iconClass: tier === "healthy" ? "text-emerald-600 bg-emerald-50" : tier === "watch" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50",
      highlight: true,
      tier,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-card p-4 min-w-0 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconClass}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{item.label}</p>
            <p className={`mt-1 truncate text-lg font-bold ${item.highlight ? "" : "text-foreground"}`}>
              {item.highlight ? (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-semibold ${healthTierColor(item.tier!)}`}>
                  {item.value}
                </span>
              ) : (
                item.value
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
