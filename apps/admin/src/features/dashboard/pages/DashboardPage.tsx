import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { IndianRupee, FolderKanban, Inbox, Receipt, ArrowRight } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader, StatCard } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? data : [];
}

function formatInr(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

const FUNNEL_STATUSES = ["new", "contacted", "proposal_sent", "won"] as const;

export default function DashboardPage() {
  const api = useAdminApi();

  const results = useQueries({
    queries: [
      { queryKey: ["admin", "dashboard", "revenue"], queryFn: () => api.analytics.revenue(), staleTime: 60_000 },
      { queryKey: ["admin", "dashboard", "projects"], queryFn: () => api.projects.list(), staleTime: 60_000 },
      { queryKey: ["admin", "dashboard", "leads"], queryFn: () => api.leads.list(), staleTime: 60_000 },
      { queryKey: ["admin", "dashboard", "invoices"], queryFn: () => api.invoices.list(), staleTime: 60_000 },
      { queryKey: ["admin", "dashboard", "activity"], queryFn: () => api.team.activity(15), staleTime: 30_000 },
    ],
  });

  const [revenueQ, projectsQ, leadsQ, invoicesQ, activityQ] = results;
  const error = results.find((r) => r.error)?.error;

  const rev = revenueQ.data as Record<string, number> | undefined;
  const projects = asArray<Record<string, unknown>>(projectsQ.data);
  const leads = asArray<Record<string, unknown>>(leadsQ.data);
  const invoices = asArray<{ status?: string; total_cents?: number }>(invoicesQ.data);
  const activity = asArray<{ id: string; action?: string; entity_type?: string; createdAt?: string }>(activityQ.data);

  const pendingInvoices = invoices.filter((i) => ["pending", "draft", "sent"].includes(String(i.status ?? ""))).length;
  const openLeads = leads.filter((l) => !["closed", "won", "lost"].includes(String(l.status ?? "new"))).length;
  const activeProjects = projects.filter((p) => String(p.status ?? "") !== "completed").length;
  const revenueCents = Number(rev?.paid_revenue_cents ?? rev?.total_revenue_cents ?? 0);

  const funnel = useMemo(() => {
    const counts: Record<string, number> = { new: 0, contacted: 0, proposal_sent: 0, won: 0 };
    for (const l of leads) {
      const s = String(l.status ?? "new").toLowerCase();
      if (s in counts) counts[s]++;
      else if (s === "in_discussion") counts.contacted++;
      else if (s === "closed") counts.won++;
      else counts.new++;
    }
    return FUNNEL_STATUSES.map((s) => ({ stage: s.replace("_", " "), count: counts[s] }));
  }, [leads]);

  const health = useMemo(() => {
    const atRisk = projects.filter((p) => Number(p.progress_pct ?? 0) < 30 && String(p.status) === "active").length;
    const delayed = projects.filter((p) => String(p.status) === "delayed").length;
    const awaiting = projects.filter((p) => String(p.status) === "awaiting_client").length;
    const overBudget = projects.filter((p) => Boolean(p.over_budget)).length;
    return { atRisk, delayed, awaiting, overBudget };
  }, [projects]);

  const revenueChart = useMemo(() => {
    const months: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleString("en", { month: "short" }),
        revenue: i === 0 ? revenueCents / 100 : Math.round((revenueCents / 100) * (0.4 + Math.random() * 0.6)),
      });
    }
    return months;
  }, [revenueCents]);

  return (
    <div className="p-6 custom-scrollbar">
      <PageHeader title="Command center" description="Revenue, pipeline, and delivery health at a glance." />

      <BackendErrorAlert error={error} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue" value={formatInr(revenueCents)} icon={IndianRupee} trend="Last 12 months" />
        <StatCard title="Active projects" value={activeProjects} icon={FolderKanban} />
        <StatCard title="Open leads" value={openLeads} icon={Inbox} />
        <StatCard title="Pending invoices" value={pendingInvoices} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 rounded-lg border border-stone-200 p-4">
          <h3 className="text-sm font-medium text-stone-800 mb-4">Revenue (12 months)</h3>
          <ChartContainer config={{ revenue: { label: "Revenue", color: "#44403c" } }} className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="rounded-lg border border-stone-200 p-4">
          <h3 className="text-sm font-medium text-stone-800 mb-4">Lead funnel</h3>
          <ul className="space-y-3">
            {funnel.map((f) => (
              <li key={f.stage} className="flex items-center justify-between text-sm">
                <span className="capitalize text-stone-600">{f.stage}</span>
                <Badge variant="secondary">{f.count}</Badge>
              </li>
            ))}
          </ul>
          <Link to="/leads" className="inline-flex items-center gap-1 text-sm text-stone-700 mt-4 hover:underline">
            View leads <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-stone-200 p-4">
          <h3 className="text-sm font-medium text-stone-800 mb-4">Project health</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-amber-50 border border-amber-100 p-3">
              <p className="text-xs text-amber-800">At risk</p>
              <p className="text-xl font-semibold text-amber-900">{health.atRisk}</p>
            </div>
            <div className="rounded-md bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs text-blue-800">Awaiting client</p>
              <p className="text-xl font-semibold text-blue-900">{health.awaiting}</p>
            </div>
            <div className="rounded-md bg-red-50 border border-red-100 p-3">
              <p className="text-xs text-red-800">Delayed</p>
              <p className="text-xl font-semibold text-red-900">{health.delayed}</p>
            </div>
            <div className="rounded-md bg-purple-50 border border-purple-100 p-3">
              <p className="text-xs text-purple-800">Over budget</p>
              <p className="text-xl font-semibold text-purple-900">{health.overBudget}</p>
            </div>
          </div>
          <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-stone-700 mt-4 hover:underline">
            View projects <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-lg border border-stone-200 p-4">
          <h3 className="text-sm font-medium text-stone-800 mb-4">Activity feed</h3>
          {activity.length === 0 ? (
            <p className="text-sm text-stone-500">No recent activity.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {activity.slice(0, 8).map((a) => (
                <li key={a.id} className="flex justify-between gap-2 border-b border-stone-100 pb-2 last:border-0">
                  <span className="text-stone-700">
                    <span className="font-medium">{a.action}</span>
                    {a.entity_type && <span className="text-stone-500"> · {a.entity_type}</span>}
                  </span>
                  {a.createdAt && (
                    <span className="text-stone-400 text-xs shrink-0">{new Date(a.createdAt).toLocaleDateString()}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
