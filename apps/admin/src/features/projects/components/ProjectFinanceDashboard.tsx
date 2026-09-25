import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Progress } from "@/components/ui/progress";
import type { ProjectFinance } from "../project-schemas";
import { formatInr } from "../project-schemas";
import { ProjectPanelError } from "./ProjectPanelError";

type Props = {
  projectId: string;
  fallback?: ProjectFinance | null;
};

function isFinanceData(data: unknown): data is ProjectFinance {
  if (!data || typeof data !== "object") return false;
  const d = data as ProjectFinance;
  return !Number.isNaN(Number(d.revenue_cents));
}

export function ProjectFinanceDashboard({ projectId, fallback }: Props) {
  const api = useAdminApi();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "projects", projectId, "finance"],
    queryFn: () => api.projects.finance(projectId) as Promise<ProjectFinance>,
    enabled: Boolean(projectId),
    retry: 1,
  });

  const resolved = isFinanceData(data) ? data : fallback ?? null;
  const usingFallback = Boolean(fallback && !isFinanceData(data));

  if (isLoading && !resolved) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}</div>;
  }

  if (!resolved) {
    return (
      <ProjectPanelError
        title="Finance dashboard unavailable"
        message={error instanceof Error ? error.message : "Could not load finance data from the server."}
        onRetry={() => void refetch()}
      />
    );
  }

  const kpis = [
    { label: "Revenue", value: formatInr(resolved.revenue_cents), accent: "text-emerald-700" },
    { label: "Expenses", value: formatInr(resolved.expenses_cents) },
    { label: "Profit", value: formatInr(resolved.profit_cents), accent: "text-emerald-700" },
    { label: "GST", value: formatInr(resolved.gst_cents) },
    { label: "Pending", value: formatInr(resolved.pending_cents), accent: resolved.pending_cents > 0 ? "text-amber-700" : undefined },
    { label: "Expected", value: formatInr(resolved.expected_cents) },
    { label: "Margin", value: `${resolved.margin_pct}%` },
    { label: "Budget", value: formatInr(resolved.budget_cents) },
  ];

  const cashflowChart = (Array.isArray(resolved.cashflow) ? resolved.cashflow : []).map((c) => ({
    month: c.month,
    Inflow: c.inflow / 100,
    Outflow: c.outflow / 100,
    Net: c.net / 100,
  }));

  return (
    <div className="space-y-4">
      {usingFallback && (
        <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
          Showing finance from project and invoice data{isError ? " — live dashboard unavailable" : ""}.
          {isError && (
            <button type="button" className="ml-2 text-primary hover:underline" onClick={() => void refetch()}>
              {isFetching ? "Retrying…" : "Retry"}
            </button>
          )}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border bg-card px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${k.accent ?? ""}`}>{k.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold">Invoice progress</p>
          <span className="text-lg font-bold text-primary">{resolved.collection_pct}%</span>
        </div>
        <Progress value={resolved.collection_pct} className="h-2" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Cashflow">
          {cashflowChart.length === 0 ? <Empty label={usingFallback ? "Cashflow charts load from API" : "No data"} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={cashflowChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                <Area type="monotone" dataKey="Inflow" stackId="1" stroke="#10b981" fill="#10b98133" />
                <Area type="monotone" dataKey="Outflow" stackId="2" stroke="#ef4444" fill="#ef444433" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Payment history">
          {resolved.payment_history.length === 0 ? <Empty label="No payments yet" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={resolved.payment_history.map((p, i) => ({ name: p.invoice_number ?? `#${i + 1}`, amount: p.amount_cents / 100 }))}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {resolved.invoices.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">All invoices</p>
          <ul className="divide-y divide-border text-sm">
            {resolved.invoices.map((inv) => (
              <li key={inv.id} className="flex justify-between py-2">
                <span>{inv.invoice_number ?? inv.id.slice(0, 8)}</span>
                <span className="font-medium">{formatInr(inv.total_cents)} · {inv.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</p>{children}</div>;
}
function Empty({ label = "No data" }: { label?: string }) {
  return <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">{label}</div>;
}
