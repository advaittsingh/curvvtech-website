import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAccessToken } from "@/lib/session";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { MessageSquare, Users, CalendarDays, IndianRupee, ArrowRight } from "lucide-react";

function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? data : [];
}

function hasError(data: unknown): data is { error: string } {
  return typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string";
}

function formatInrCents(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function DashboardOverview() {
  const token = getAccessToken();

  const results = useQueries({
    queries: [
      {
        queryKey: ["admin", "dashboard", "chat-analytics"],
        queryFn: () => adminApi(token).chats.analytics(),
        staleTime: 60_000,
      },
      {
        queryKey: ["admin", "dashboard", "leads"],
        queryFn: () => adminApi(token).leads.list(),
        staleTime: 60_000,
      },
      {
        queryKey: ["admin", "dashboard", "demos"],
        queryFn: () => adminApi(token).demoRequests.list(),
        staleTime: 30_000,
      },
      {
        queryKey: ["admin", "dashboard", "clients"],
        queryFn: () => adminApi(token).clients.list(),
        staleTime: 60_000,
      },
      {
        queryKey: ["admin", "dashboard", "blogs"],
        queryFn: () => adminApi(token).blogs.list(),
        staleTime: 60_000,
      },
      {
        queryKey: ["admin", "dashboard", "revenue"],
        queryFn: () => adminApi(token).analytics.revenue(),
        staleTime: 60_000,
      },
      {
        queryKey: ["admin", "dashboard", "projects"],
        queryFn: () => adminApi(token).projects.list(),
        staleTime: 60_000,
      },
    ],
  });

  const [chatQ, leadsQ, demosQ, clientsQ, blogsQ, revenueQ, projectsQ] = results;

  const chatA = chatQ.data && !hasError(chatQ.data) ? (chatQ.data as Record<string, unknown>) : null;
  const leads = asArray<Record<string, unknown>>(leadsQ.data);
  const demos = asArray<{ status?: string; name?: string; email?: string; date?: string; time?: string }>(demosQ.data);
  const clients = asArray<unknown>(clientsQ.data);
  const blogs = asArray<unknown>(blogsQ.data);
  const rev = revenueQ.data && !hasError(revenueQ.data) ? (revenueQ.data as Record<string, number>) : null;
  const projects = asArray<{
    id?: string;
    name?: string;
    client_name?: string;
    progress_pct?: number;
    status?: string;
  }>(projectsQ.data);

  const pendingDemos = demos.filter((d) => (d.status ?? "pending") === "pending").length;
  const paidCents = Number(rev?.paid_revenue_cents ?? 0);
  const chatsToday = Number(chatA?.chats_today ?? 0);

  const demoPie = (() => {
    const c = { pending: 0, confirmed: 0, completed: 0 };
    for (const d of demos) {
      const s = String(d.status ?? "pending");
      if (s in c) (c as Record<string, number>)[s]++;
    }
    return [
      { name: "Pending", value: c.pending, fill: "#ca8a04" },
      { name: "Confirmed", value: c.confirmed, fill: "#2563eb" },
      { name: "Completed", value: c.completed, fill: "#16a34a" },
    ].filter((x) => x.value > 0);
  })();

  const invoiceBar = [
    { name: "Paid", count: Number(rev?.invoices_paid ?? 0) },
    { name: "Sent", count: Number(rev?.invoices_sent ?? 0) },
    { name: "Draft", count: Number(rev?.invoices_draft ?? 0) },
  ];

  const pipelineBar = [
    { name: "Leads", count: leads.length },
    { name: "Clients", count: clients.length },
    { name: "Blogs", count: blogs.length },
  ];

  const recentDemos = [...demos]
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
    .slice(0, 3);

  const loading = results.some((r) => r.isLoading);
  const anyErr = results.find((r) => r.isError);

  const pieConfig = {
    pending: { label: "Pending", color: "#ca8a04" },
    confirmed: { label: "Confirmed", color: "#2563eb" },
    completed: { label: "Completed", color: "#16a34a" },
  };

  const barInvConfig = {
    count: { label: "Count", color: "#16a34a" },
  };

  const barPipeConfig = {
    count: { label: "Records", color: "#0c0a09" },
  };

  return (
    <div className="space-y-8">
      {loading && <p className="text-sm text-stone-500">Loading dashboard…</p>}
      {anyErr && <p className="text-sm text-amber-700">Some widgets failed to load. Check other pages or try again.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-stone-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-stone-500">Chats today</p>
                <p className="text-2xl font-semibold text-stone-900 mt-1">{Number.isFinite(chatsToday) ? chatsToday : "—"}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-stone-300" aria-hidden />
            </div>
            <Link to="/chat-dashboard" className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1 mt-3">
              Open chat <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-stone-500">CRM leads</p>
                <p className="text-2xl font-semibold text-stone-900 mt-1">{leads.length}</p>
              </div>
              <Users className="h-8 w-8 text-stone-300" aria-hidden />
            </div>
            <Link to="/leads" className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1 mt-3">
              View leads <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-stone-500">Demos pending</p>
                <p className="text-2xl font-semibold text-stone-900 mt-1">{pendingDemos}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-stone-300" aria-hidden />
            </div>
            <Link to="/demo-requests" className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1 mt-3">
              Inbound opportunities <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-stone-500">Revenue (paid)</p>
                <p className="text-2xl font-semibold text-stone-900 mt-1">{formatInrCents(paidCents)}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-stone-300" aria-hidden />
            </div>
            <Link to="/analytics" className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1 mt-3">
              Analytics <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-stone-200 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent demo bookings</CardTitle>
            <p className="text-xs text-stone-500">Latest from FollowUp</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentDemos.length === 0 ? (
              <p className="text-sm text-stone-500">No bookings yet.</p>
            ) : (
              recentDemos.map((d, i) => (
                <div key={i} className="flex gap-3 border-b border-stone-100 last:border-0 pb-3 last:pb-0">
                  <CalendarDays className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{d.name ?? "—"}</p>
                    <p className="text-xs text-stone-500 truncate">{d.email}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      {d.date} {d.time} IST · <span className="capitalize">{d.status ?? "pending"}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-stone-200 lg:col-span-2">
          <CardHeader className="border-b border-stone-200 pb-4">
            <CardTitle className="text-lg font-semibold text-stone-900">Projects</CardTitle>
            <p className="text-sm text-stone-500">
              {projects.length} total · from CRM
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {projects.length === 0 ? (
              <p className="p-6 text-sm text-stone-500">No projects yet. Add clients and projects from the Clients page.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {projects.slice(0, 8).map((p) => (
                      <tr key={String(p.id)} className="hover:bg-stone-50/80">
                        <td className="px-4 py-3 font-medium text-stone-900">{p.name ?? "—"}</td>
                        <td className="px-4 py-3 text-stone-600">{p.client_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <span className="text-xs text-stone-500 w-8">{p.progress_pct ?? 0}%</span>
                            <Progress value={p.progress_pct ?? 0} className="h-2 flex-1" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-stone-900">Inbound opportunities</CardTitle>
            <p className="text-sm text-stone-500">By status</p>
          </CardHeader>
          <CardContent>
            {demoPie.length === 0 ? (
              <p className="text-sm text-stone-500 h-[240px] flex items-center justify-center">No demo data</p>
            ) : (
              <ChartContainer config={pieConfig} className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={demoPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {demoPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-stone-900">Invoices</CardTitle>
            <p className="text-sm text-stone-500">Counts by status</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barInvConfig} className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invoiceBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200" />
                  <XAxis dataKey="name" className="text-xs" axisLine={false} tickLine={false} />
                  <YAxis className="text-xs" axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} name="Invoices" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-stone-900">Content & CRM</CardTitle>
            <p className="text-sm text-stone-500">Record totals</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barPipeConfig} className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200" />
                  <XAxis dataKey="name" className="text-xs" axisLine={false} tickLine={false} />
                  <YAxis className="text-xs" axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#292524" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
