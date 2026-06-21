import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  Crown,
  FolderKanban,
  IndianRupee,
  ListTodo,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/app/providers";
import { PageHeader, StatCard } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CeoDashboard = {
  money: {
    cash_in_bank_cents: number;
    outstanding_cents: number;
    pipeline_value_cents: number;
    revenue_this_month_cents: number;
  };
  business_health: {
    active_projects: number;
    projects_at_risk: number;
    leads_this_month: number;
    proposal_conversion_pct: number;
  };
  team: {
    utilization_pct: number;
    tasks_due_today: number;
    overdue_tasks: number;
    available_capacity_pct: number;
  };
  ai_founder: {
    summary: { label: string; href?: string }[];
    suggested_actions: { label: string; href: string; kind: string }[];
  };
  charts: {
    revenue_trend: { month: string; revenue: number }[];
    cash_flow: { month: string; money_in: number; money_out: number }[];
    pipeline_forecast: { period: string; expected: number }[];
  };
  project_risks: {
    id: string;
    project_name: string;
    client_name: string;
    risk_level: string;
    risk_label: string;
    due_date: string | null;
  }[];
};

function formatInr(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
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

function formatDueDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function riskBadgeVariant(level: string): "destructive" | "secondary" | "outline" {
  if (level === "high") return "destructive";
  if (level === "medium") return "secondary";
  return "outline";
}

function MetricSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{children}</div>
    </section>
  );
}

export default function CeoCommandCenterPage() {
  const api = useAdminApi();
  const { user } = useAuth();
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin", "analytics", "ceo"],
    queryFn: () => api.analytics.ceo() as Promise<CeoDashboard>,
    staleTime: 60_000,
  });

  const dash = data;

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-background min-h-full">
      <PageHeader
        title="CEO Command Center"
        description="Money, delivery risk, and what needs your attention today."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/">Standard dashboard</Link>
          </Button>
        }
      />

      <BackendErrorAlert error={error} />

      {/* Hero — AI Founder Assistant */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-stone-900 via-stone-900 to-stone-800 text-white p-6 lg:p-8 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-2.5">
                <Crown className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <p className="text-sm text-white/70 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  AI Founder Assistant
                </p>
                <h2 className="text-xl lg:text-2xl font-semibold">
                  {timeGreeting()}, {greetingName(user?.email)}
                </h2>
              </div>
            </div>

            <div>
              <p className="text-sm text-white/80 mb-2">You have:</p>
              <ul className="space-y-1.5">
                {(dash?.ai_founder.summary ?? [{ label: isLoading ? "Loading…" : "No urgent items" }]).map(
                  (item) => (
                    <li key={item.label} className="text-sm flex items-start gap-2">
                      <span className="text-amber-300 mt-0.5">•</span>
                      {item.href ? (
                        <Link to={item.href} className="hover:underline text-white/95">
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-white/95">{item.label}</span>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>

          <div className="lg:w-80 shrink-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-white/60 mb-3">Recommended actions</p>
            {(dash?.ai_founder.suggested_actions ?? []).map((action) => (
              <Button
                key={action.kind + action.href}
                asChild
                variant="secondary"
                className="w-full justify-start bg-white/10 text-white border-white/10 hover:bg-white/20 hover:text-white"
              >
                <Link to={action.href}>{action.label}</Link>
              </Button>
            ))}
            {!isLoading && !dash?.ai_founder.suggested_actions.length && (
              <p className="text-sm text-white/60">No actions queued — you&apos;re caught up.</p>
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full mt-2 border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/ai">
                <Bot className="h-4 w-4 mr-2" />
                Open AI Command Center
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Row 1 — Money */}
      <MetricSection title="Money">
        <StatCard
          title="Cash in bank"
          value={dash ? formatInr(dash.money.cash_in_bank_cents) : "—"}
          icon={IndianRupee}
        />
        <StatCard
          title="Outstanding invoices"
          value={dash ? formatInr(dash.money.outstanding_cents) : "—"}
          trend="Sent & draft invoices"
          icon={AlertTriangle}
        />
        <StatCard
          title="Pipeline value"
          value={dash ? formatInr(dash.money.pipeline_value_cents) : "—"}
          icon={TrendingUp}
        />
        <StatCard
          title="Revenue this month"
          value={dash ? formatInr(dash.money.revenue_this_month_cents) : "—"}
          icon={IndianRupee}
        />
      </MetricSection>

      {/* Row 2 — Business Health */}
      <MetricSection title="Business health">
        <StatCard
          title="Active projects"
          value={dash?.business_health.active_projects ?? "—"}
          icon={FolderKanban}
        />
        <StatCard
          title="Projects at risk"
          value={dash?.business_health.projects_at_risk ?? "—"}
          trendUp={(dash?.business_health.projects_at_risk ?? 0) === 0}
          trend={(dash?.business_health.projects_at_risk ?? 0) > 0 ? "Needs review" : "All clear"}
          icon={AlertTriangle}
        />
        <StatCard
          title="Leads this month"
          value={dash?.business_health.leads_this_month ?? "—"}
          icon={TrendingUp}
        />
        <StatCard
          title="Proposal conversion"
          value={dash ? `${dash.business_health.proposal_conversion_pct}%` : "—"}
          icon={TrendingUp}
        />
      </MetricSection>

      {/* Row 3 — Team */}
      <MetricSection title="Team">
        <StatCard title="Team utilization" value={dash ? `${dash.team.utilization_pct}%` : "—"} icon={Users} />
        <StatCard title="Tasks due today" value={dash?.team.tasks_due_today ?? "—"} icon={ListTodo} />
        <StatCard
          title="Overdue tasks"
          value={dash?.team.overdue_tasks ?? "—"}
          trendUp={(dash?.team.overdue_tasks ?? 0) === 0}
          icon={ListTodo}
        />
        <StatCard
          title="Available capacity"
          value={dash ? `${dash.team.available_capacity_pct}%` : "—"}
          trend="Headroom for new work"
          trendUp={(dash?.team.available_capacity_pct ?? 0) > 20}
          icon={Users}
        />
      </MetricSection>

      {/* Charts */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends & forecast</h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm xl:col-span-1">
            <h3 className="text-sm font-semibold text-foreground">Revenue trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Last 12 months — paid invoices</p>
            <ChartContainer
              config={{ revenue: { label: "Revenue", color: "#111111" } }}
              className="h-[220px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dash?.charts.revenue_trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm xl:col-span-1">
            <h3 className="text-sm font-semibold text-foreground">Cash flow</h3>
            <p className="text-xs text-muted-foreground mb-4">Money in vs money out</p>
            <ChartContainer
              config={{
                money_in: { label: "Money in", color: "#22C55E" },
                money_out: { label: "Money out", color: "#EF4444" },
              }}
              className="h-[220px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dash?.charts.cash_flow ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="money_in" fill="var(--color-money_in)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="money_out" fill="var(--color-money_out)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm xl:col-span-1">
            <h3 className="text-sm font-semibold text-foreground">Pipeline forecast</h3>
            <p className="text-xs text-muted-foreground mb-4">Expected revenue — next 90 days</p>
            <ChartContainer
              config={{ expected: { label: "Expected", color: "#6366F1" } }}
              className="h-[220px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dash?.charts.pipeline_forecast ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="expected" fill="var(--color-expected)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      </section>

      {/* Project risks table */}
      <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Project risks</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Click a row to open the project</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/projects">All projects</Link>
          </Button>
        </div>
        {!dash?.project_risks.length ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">
            No projects flagged at risk — delivery looks on track.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dash.project_risks.map((row) => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/projects/${row.id}`} className="font-medium hover:underline">
                      {row.project_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.client_name}</TableCell>
                  <TableCell>
                    <Badge variant={riskBadgeVariant(row.risk_level)} className="capitalize">
                      {row.risk_label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatDueDate(row.due_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
