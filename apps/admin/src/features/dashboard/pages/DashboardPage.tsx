import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  FileSignature,
  FolderKanban,
  IndianRupee,
  Inbox,
  ListTodo,
  Plus,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/app/providers";
import { PageHeader, StatCard } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { MiniChart } from "@/components/dashboard/mini-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

type DashboardOverview = {
  revenue: {
    paid_all_time_cents: number;
    paid_this_month_cents: number;
    mom_change_pct: number;
    outstanding_cents: number;
    sparkline: number[];
  };
  monthly_chart: { month: string; revenue: number; payments_received: number; outstanding: number }[];
  today_snapshot: {
    new_leads_today: number;
    follow_ups_due: number;
    pending_invoices_cents: number;
    pending_invoice_count: number;
    active_projects: number;
    tasks_due_today: number;
    overdue_invoices: number;
  };
  team_utilization_pct: number;
  lead_funnel: { stage: string; count: number; conversion_pct: number }[];
  pipeline: { open_leads: number; pipeline_value_cents: number };
  project_health: { on_track: number; at_risk: number; delayed: number; awaiting_client: number };
  client_health: {
    id: string;
    name: string;
    outstanding_cents: number;
    project_status: string;
    invoice_overdue: boolean;
  }[];
  activity: { id: string; message: string; created_at: string }[];
  ai_assistant: {
    overdue_follow_ups: number;
    pending_payments_cents: number;
    pending_invoices: number;
    overdue_invoices: number;
    projects_at_risk: number;
    proposals_awaiting: number;
    suggested_actions: { label: string; href: string }[];
  };
};

function formatInr(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCompactInr(cents: number) {
  const rupees = cents / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return formatInr(cents);
}

function greetingName(email: string | null | undefined): string {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "there";
  return local.charAt(0).toUpperCase() + local.slice(1).replace(/[._]/g, " ");
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  discovery_call: "Discovery call",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  contacted: "Contacted",
  in_discussion: "In discussion",
  closed: "Closed",
};

const QUICK_ACTIONS = [
  { label: "New lead", href: "/leads", icon: Inbox },
  { label: "Create proposal", href: "/proposals", icon: FileSignature },
  { label: "Create invoice", href: "/invoices", icon: Receipt },
  { label: "Create project", href: "/projects", icon: FolderKanban },
] as const;

export default function DashboardPage() {
  const api = useAdminApi();
  const { user } = useAuth();
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", "overview"],
    queryFn: () => api.analytics.overview() as Promise<DashboardOverview>,
    staleTime: 60_000,
  });

  const mom = data?.revenue.mom_change_pct ?? 0;
  const momUp = mom >= 0;
  const sparkLabels = ["", "", "", "", "", "", "", "", "", "", "", "Now"];

  return (
    <div className="p-6 lg:p-8 custom-scrollbar space-y-6 bg-background min-h-full">
      <PageHeader
        title="Command Center"
        description="Revenue, pipeline and delivery health at a glance."
        action={
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
              <Button key={href} variant="outline" size="sm" asChild className="border-border">
                <Link to={href}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {label}
                </Link>
              </Button>
            ))}
          </div>
        }
      />

      <BackendErrorAlert error={error} />

      {/* Today's snapshot */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-semibold text-foreground">Today&apos;s snapshot</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "New leads today", value: data?.today_snapshot.new_leads_today ?? "—", href: "/leads" },
            { label: "Follow-ups due", value: data?.today_snapshot.follow_ups_due ?? "—", href: "/leads" },
            {
              label: "Pending invoices",
              value: data ? formatCompactInr(data.today_snapshot.pending_invoices_cents) : "—",
              href: "/invoices",
            },
            {
              label: "Active projects",
              value: data?.today_snapshot.active_projects ?? "—",
              href: "/projects",
            },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="rounded-lg border border-border bg-background px-4 py-3 hover:border-primary/20 transition-colors"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-semibold text-foreground mt-1">{isLoading ? "…" : item.value}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* KPI row — 6 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard
          title="Revenue"
          value={data ? formatInr(data.revenue.paid_all_time_cents) : "—"}
          trend={data ? `${momUp ? "+" : ""}${mom}% vs last month` : undefined}
          trendUp={momUp}
          icon={IndianRupee}
          footer={
            data?.revenue.sparkline.some((v) => v > 0) ? (
              <MiniChart data={data.revenue.sparkline.map((c) => c / 100)} labels={sparkLabels} activeColor="#111111" />
            ) : null
          }
        />
        <StatCard
          title="Pipeline value"
          value={data ? formatCompactInr(data.pipeline.pipeline_value_cents) : "—"}
          trend={data ? `${data.pipeline.open_leads} open leads` : undefined}
          icon={TrendingUp}
        />
        <StatCard
          title="Active projects"
          value={data?.today_snapshot.active_projects ?? "—"}
          trend="In delivery"
          icon={FolderKanban}
        />
        <StatCard
          title="Pending invoices"
          value={data ? formatCompactInr(data.revenue.outstanding_cents) : "—"}
          trend={
            data?.today_snapshot.overdue_invoices
              ? `${data.today_snapshot.overdue_invoices} overdue`
              : "On schedule"
          }
          trendUp={!data?.today_snapshot.overdue_invoices}
          icon={Receipt}
        />
        <StatCard
          title="Tasks due today"
          value={data?.today_snapshot.tasks_due_today ?? "—"}
          trend="Milestones & follow-ups"
          icon={ListTodo}
        />
        <StatCard
          title="Team utilization"
          value={data ? `${data.team_utilization_pct}%` : "—"}
          trend="Delivery capacity"
          trendUp={(data?.team_utilization_pct ?? 0) < 90}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue analytics */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-1">Revenue analytics</h3>
          <p className="text-xs text-muted-foreground mb-4">Monthly view — revenue, payments received, outstanding</p>
          <ChartContainer
            config={{
              revenue: { label: "Revenue", color: "#111111" },
              payments_received: { label: "Payments received", color: "#22C55E" },
              outstanding: { label: "Outstanding", color: "#EF4444" },
            }}
            className="h-[260px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.monthly_chart ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `₹${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="payments_received" stroke="var(--color-payments_received)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="outstanding" stroke="var(--color-outstanding)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Lead funnel */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Lead funnel</h3>
          <ul className="space-y-2.5">
            {(data?.lead_funnel ?? []).map((f) => (
              <li key={f.stage} className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground">{STAGE_LABELS[f.stage] ?? f.stage}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{f.conversion_pct}%</span>
                  <Badge variant="secondary" className="font-medium">
                    {f.count}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/leads" className="inline-block text-sm text-foreground mt-4 hover:underline font-medium">
            View pipeline →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* AI Assistant */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm xl:order-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-lg bg-primary p-2">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">
                {timeGreeting()}, {greetingName(user?.email)}
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-foreground mb-4">
            <li>• {data?.ai_assistant.overdue_follow_ups ?? 0} leads need follow-up</li>
            <li>• {data?.ai_assistant.overdue_invoices ?? 0} invoices overdue</li>
            <li>• {data?.ai_assistant.projects_at_risk ?? 0} projects at risk</li>
          </ul>
          <div className="flex flex-col gap-2">
            {(data?.ai_assistant.suggested_actions ?? []).map((action) => (
              <Button key={action.href + action.label} variant="secondary" size="sm" asChild className="justify-start">
                <Link to={action.href}>{action.label}</Link>
              </Button>
            ))}
            <Button variant="outline" size="sm" asChild className="justify-start">
              <Link to="/dashboard/ai-agent">Open AI Agent →</Link>
            </Button>
          </div>
        </div>

        {/* Project health — green / yellow / red */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Project health</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="text-xs font-medium text-success">On track</p>
                <p className="text-2xl font-semibold text-foreground">{data?.project_health.on_track ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="text-xs font-medium text-warning">At risk</p>
                <p className="text-2xl font-semibold text-foreground">{data?.project_health.at_risk ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
              <XCircle className="h-5 w-5 text-danger shrink-0" />
              <div>
                <p className="text-xs font-medium text-danger">Delayed</p>
                <p className="text-2xl font-semibold text-foreground">{data?.project_health.delayed ?? 0}</p>
              </div>
            </div>
          </div>
          <Link to="/projects" className="inline-block text-sm text-foreground mt-4 hover:underline font-medium">
            View projects →
          </Link>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Activity feed</h3>
          {!data?.activity.length ? (
            <p className="text-sm text-muted-foreground">Activity appears as your team works in the OS.</p>
          ) : (
            <ul className="space-y-3">
              {data.activity.map((item) => (
                <li key={item.id} className="flex gap-2 text-sm border-b border-border pb-2 last:border-0">
                  <span className="text-muted-foreground shrink-0">•</span>
                  <div className="min-w-0">
                    <p className="text-foreground truncate">{item.message}</p>
                    {item.created_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(item.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Client health — full width on large screens */}
      {!!data?.client_health.length && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top clients</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.client_health.map((client) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="rounded-lg border border-border p-4 hover:border-primary/20 transition-colors"
              >
                <p className="font-medium text-foreground">{client.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {client.outstanding_cents > 0
                    ? `${formatCompactInr(client.outstanding_cents)} outstanding`
                    : "Project on track"}
                </p>
                {client.invoice_overdue && (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    Invoice overdue
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
