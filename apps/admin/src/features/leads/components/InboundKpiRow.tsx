import { CalendarClock, CheckCircle2, DollarSign, Inbox, Target, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { InboundMetrics } from "../inbound-metrics";
import { formatInrCompact } from "../constants";

type Tile = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
};

export function InboundKpiRow({ metrics }: { metrics: InboundMetrics }) {
  const tiles: Tile[] = [
    { icon: Inbox, label: "Inbound today", value: String(metrics.inboundToday), hint: `${metrics.total} total` },
    { icon: CheckCircle2, label: "Qualified", value: String(metrics.qualified) },
    {
      icon: DollarSign,
      label: "Expected revenue",
      value: formatInrCompact(metrics.expectedRevenueCents),
      hint: `${formatInrCompact(metrics.pipelineValueCents)} pipeline`,
      highlight: true,
    },
    { icon: Target, label: "Avg lead score", value: metrics.avgScore ? `${metrics.avgScore}` : "—" },
    { icon: TrendingUp, label: "Conversion rate", value: `${metrics.conversionRate}%` },
    { icon: CalendarClock, label: "Meetings today", value: String(metrics.meetingsToday) },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.label}
            className={`rounded-xl border p-3.5 ${
              t.highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">{t.label}</span>
            </div>
            <p className={`text-xl font-semibold leading-tight ${t.highlight ? "text-primary" : ""}`}>{t.value}</p>
            {t.hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
