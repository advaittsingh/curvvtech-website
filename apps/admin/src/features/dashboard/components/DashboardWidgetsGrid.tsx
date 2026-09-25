import { motion } from "framer-motion";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Wallet } from "lucide-react";
import type { DashboardOverview } from "../dashboard.types";
import { formatCompactInr, formatInr } from "../dashboard.utils";
import { DashboardCard } from "./DashboardCard";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = { data?: DashboardOverview; isLoading?: boolean };

export function DashboardWidgetsGrid({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const w = data.widgets ?? {
    revenue_forecast_cents: 0,
    pending_collections_this_week_cents: 0,
    pending_collections_this_week_count: 0,
    monthly_profit: { revenue_cents: 0, expenses_cents: 0, profit_cents: 0 },
    cash_flow: [],
  };
  const profit = w.monthly_profit ?? { revenue_cents: 0, expenses_cents: 0, profit_cents: 0 };
  const cashFlowData = (w.cash_flow ?? []).slice(-6).map((c) => ({
    month: c.month,
    Income: c.inflow / 100,
    Expenses: c.outflow / 100,
    Net: c.net / 100,
  }));

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operations</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <DashboardCard href="/invoices">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Revenue forecast</span>
          </div>
          <p className="text-xl font-bold tabular-nums">
            <AnimatedNumber value={w.revenue_forecast_cents} format={(n) => formatCompactInr(n)} />
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Expected this month</p>
        </DashboardCard>

        <DashboardCard href="/invoices?status=sent">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Pending collections</span>
          </div>
          <p className="text-xl font-bold tabular-nums">
            <AnimatedNumber
              value={w.pending_collections_this_week_cents}
              format={(n) => formatCompactInr(n)}
            />
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{w.pending_collections_this_week_count} due this week</p>
        </DashboardCard>

        <motion.div
          className="sm:col-span-2"
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <DashboardCard
            className="bg-gradient-to-br from-emerald-500/5 to-card border-emerald-500/20 h-full"
            title="Monthly profit"
            description="Primary financial signal"
          >
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-3xl font-bold text-emerald-700 tabular-nums">
                  <AnimatedNumber value={profit.profit_cents} format={(n) => formatCompactInr(n)} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">Net profit this month</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm min-w-[200px]">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Revenue</p>
                  <p className="font-semibold tabular-nums">{formatCompactInr(profit.revenue_cents)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Expenses</p>
                  <p className="font-semibold tabular-nums">{formatCompactInr(profit.expenses_cents)}</p>
                </div>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted mt-4 overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${profit.revenue_cents > 0 ? Math.min(100, Math.round((profit.profit_cents / profit.revenue_cents) * 100)) : 0}%`,
                }}
                transition={{ duration: 0.7 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Profit margin</p>
          </DashboardCard>
        </motion.div>

        <DashboardCard title="Cash flow" description="Income · Expenses · Net" className="xl:col-span-4">
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={44} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v: number) => formatInr(v * 100)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Income" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={16} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={16} />
              <Line type="monotone" dataKey="Net" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </DashboardCard>
      </div>
    </div>
  );
}
