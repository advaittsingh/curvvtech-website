import { useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import type { ChartMetric, ChartRange, DashboardOverview } from "../dashboard.types";
import { DashboardCard } from "./DashboardCard";

const METRICS: { id: ChartMetric; label: string; color: string }[] = [
  { id: "revenue", label: "Revenue", color: "#111111" },
  { id: "collections", label: "Collections", color: "#22c55e" },
  { id: "profit", label: "Profit", color: "#8b5cf6" },
  { id: "expenses", label: "Expenses", color: "#ef4444" },
];

const RANGES: { id: ChartRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
  { id: "lifetime", label: "Lifetime" },
];

type Props = { data?: DashboardOverview; isLoading?: boolean };

export function RevenueAnalyticsChart({ data, isLoading }: Props) {
  const [metric, setMetric] = useState<ChartMetric>("collections");
  const [range, setRange] = useState<ChartRange>("year");
  const [fullscreen, setFullscreen] = useState(false);

  const chartData = useMemo(() => {
    if (!data) return [];
    if (range === "7d") {
      return (data.daily_chart ?? []).map((d) => ({
        period: d.period ?? "",
        revenue: d.revenue,
        collections: d.collections,
        profit: d.profit,
        expenses: d.expenses,
      }));
    }
    const monthly = (data.monthly_chart ?? []).map((m) => ({
      period: m.month ?? "",
      revenue: m.revenue,
      collections: m.collections ?? m.payments_received ?? 0,
      profit: m.profit,
      expenses: m.expenses,
    }));
    if (range === "30d") return monthly.slice(-1);
    if (range === "quarter") return monthly.slice(-3);
    if (range === "year") return monthly;
    return monthly;
  }, [data, range]);

  const active = METRICS.find((m) => m.id === metric)!;
  const config = Object.fromEntries(METRICS.map((m) => [m.id, { label: m.label, color: m.color }]));

  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1">
          {METRICS.map((m) => (
            <Button
              key={m.id}
              variant={metric === m.id ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              variant={range === r.id ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </Button>
          ))}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen((f) => !f)}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="h-[240px] rounded-lg bg-muted/30 animate-pulse" />
      ) : (
        <ChartContainer config={config} className={fullscreen ? "h-[420px]" : "h-[240px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `₹${v}`} width={48} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey={metric} stroke={active.color} strokeWidth={2} dot={false} name={active.label} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
    </>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur p-6 overflow-auto">
        <DashboardCard title="Revenue analytics" className="max-w-6xl mx-auto">
          {body}
        </DashboardCard>
      </div>
    );
  }

  return (
    <DashboardCard title="Revenue analytics" description="Collections, profit, and expenses over time">
      {body}
    </DashboardCard>
  );
}
