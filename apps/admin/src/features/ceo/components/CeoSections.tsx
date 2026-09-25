import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  Crown,
  Maximize2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnimatedNumber } from "@/features/dashboard/components/AnimatedNumber";
import type { CeoCommandCenter } from "../ceo.types";
import { formatCompactInr, formatInr, formatRelativeTime } from "../ceo.utils";

type Props = {
  data?: CeoCommandCenter;
  userName: string;
  greeting: string;
  isLoading?: boolean;
};

function Divider() {
  return <div className="h-px bg-white/10" />;
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2.5"
          strokeDasharray={`${score} 100`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{score}</span>
      </div>
    </div>
  );
}

function HealthBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

const PRIORITY_STYLES = {
  critical: "border-red-500/30 bg-red-500/5",
  medium: "border-amber-500/30 bg-amber-500/5",
  low: "border-border bg-muted/30",
};

export function CeoHeroSection({ data, userName, greeting, isLoading }: Props) {
  const h = data?.hero;
  const score = data?.business_score_breakdown;

  return (
    <section className="rounded-2xl border border-stone-800 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800 text-white p-6 lg:p-8 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(251,191,36,0.12),_transparent_50%)] pointer-events-none" />
      <div className="relative space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-300/80 font-medium">Founder Command Center</p>
            <h1 className="text-2xl lg:text-3xl font-bold mt-1">
              {greeting}, {userName} 👋
            </h1>
            <p className="text-sm text-white/60 mt-1">{h?.date_label ?? (isLoading ? "…" : "")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ScoreRing score={h?.business_score ?? 0} />
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">Business score</p>
              <p className="text-2xl font-bold">
                {isLoading ? "…" : <AnimatedNumber value={h?.business_score ?? 0} format={(n) => `${n}/100`} />}
              </p>
              {(score?.delta_week ?? 0) !== 0 && (
                <p className={`text-xs flex items-center gap-1 mt-0.5 ${(score?.delta_week ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(score?.delta_week ?? 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {(score?.delta_week ?? 0) >= 0 ? "+" : ""}
                  {score?.delta_week} this week
                </p>
              )}
            </div>
          </div>

          <Divider />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-2">Today&apos;s priorities</p>
            <ol className="space-y-1.5">
              {(data?.priorities ?? []).length === 0 ? (
                <li className="text-sm text-white/60">No urgent priorities — great day to plan ahead.</li>
              ) : (
                data?.priorities.map((p) => (
                  <li key={p.href + p.label}>
                    <Link to={p.href} className="text-sm hover:text-amber-300 transition-colors flex gap-2">
                      <span className="text-amber-400 font-semibold">{p.rank}.</span>
                      <span className="hover:underline">{p.label}</span>
                    </Link>
                  </li>
                ))
              )}
            </ol>
          </div>

          <Divider />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Revenue", value: formatCompactInr(h?.revenue_today_cents ?? 0), href: "/payments" },
              { label: "Pipeline", value: formatCompactInr(h?.pipeline_value_cents ?? 0), href: "/leads" },
              { label: "Collections", value: formatCompactInr(h?.collections_due_cents ?? 0), href: "/invoices?status=sent" },
              { label: "Projects", value: String(h?.active_projects ?? 0), href: "/projects" },
            ].map((m) => (
              <Link
                key={m.label}
                to={m.href}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 hover:bg-white/10 transition-colors"
              >
                <p className="text-[10px] uppercase text-white/50">{m.label}</p>
                <p className="text-sm font-bold tabular-nums mt-0.5">{isLoading ? "…" : m.value}</p>
              </Link>
            ))}
          </div>
      </div>
    </section>
  );
}

export function CeoRankedActions({ data, isLoading }: { data?: CeoCommandCenter; isLoading?: boolean }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recommended actions</h2>
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {(data?.ranked_actions ?? []).map((a) => (
            <Link
              key={a.href + a.label}
              to={a.href}
              className={`block rounded-lg border px-3 py-2.5 hover:shadow-md transition-all ${PRIORITY_STYLES[a.priority]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">{a.priority}</p>
                  <p className="text-sm font-medium mt-0.5">{a.label}</p>
                  {a.detail && <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function CeoDailyBrief({ data, isLoading }: { data?: CeoCommandCenter; isLoading?: boolean }) {
  const brief = data?.founder_brief;
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm h-full">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Daily brief</h2>
      {isLoading ? (
        <div className="h-32 bg-muted/30 rounded animate-pulse" />
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground mb-2">Yesterday</p>
            <div className="grid grid-cols-3 gap-2">
              {brief?.yesterday.map((y) => (
                <div key={y.label} className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{y.label}</p>
                  <p className="text-xs font-semibold">{y.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground mb-2">Today</p>
            <div className="grid grid-cols-3 gap-2">
              {brief?.today.map((t) => (
                <div key={t.label} className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{t.label}</p>
                  <p className="text-xs font-semibold">{t.value}</p>
                </div>
              ))}
            </div>
          </div>
          {(brief?.watch ?? []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-2">Watch</p>
              <ul className="space-y-1">
                {brief?.watch.map((w) => (
                  <li key={w.href + w.label}>
                    <Link to={w.href} className="flex justify-between text-xs hover:text-primary">
                      <span>{w.label}</span>
                      <span className="text-muted-foreground">{w.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function CeoMoneyGrid({ data, isLoading }: { data?: CeoCommandCenter; isLoading?: boolean }) {
  const m = data?.money;
  const items = [
    { label: "Cash", value: m?.cash_cents ?? 0 },
    { label: "Receivables", value: m?.receivables_cents ?? 0 },
    { label: "Payables", value: m?.payables_cents ?? 0 },
    { label: "Profit", value: m?.profit_month_cents ?? 0 },
    { label: "Expenses", value: m?.expenses_month_cents ?? 0 },
    { label: "Forecast", value: m?.forecast_cents ?? 0 },
    { label: "GST liability", value: m?.gst_liability_cents ?? 0 },
    { label: "Margin", value: null, display: `${m?.margin_pct ?? 0}%` },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Money</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <motion.div key={item.label} whileHover={{ y: -2 }} className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] uppercase text-muted-foreground font-medium">{item.label}</p>
            <p className="text-lg font-bold tabular-nums mt-1">
              {isLoading ? "…" : item.display ?? formatCompactInr(item.value ?? 0)}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function CeoHealthAndTeam({ data, isLoading }: { data?: CeoCommandCenter; isLoading?: boolean }) {
  const health = data?.business_health;
  const team = data?.team;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Business health</h2>
        <div className="space-y-3">
          {(["delivery", "finance", "sales", "marketing", "support"] as const).map((key) => (
            <HealthBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={health?.[key] ?? 0} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Team capacity</h2>
        {(team?.members ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {team?.members.map((m) => (
              <div key={m.user_id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium capitalize">{m.name} <span className="text-muted-foreground">({m.role})</span></span>
                  <span>{m.utilization_pct}%</span>
                </div>
                <Progress value={m.utilization_pct} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function CeoProjectRisks({ data, isLoading }: { data?: CeoCommandCenter; isLoading?: boolean }) {
  const r = data?.project_risks;
  const buckets = [
    { label: "Healthy", count: r?.healthy ?? 0, color: "text-emerald-600" },
    { label: "Near deadline", count: r?.near_deadline ?? 0, color: "text-amber-600" },
    { label: "Blocked", count: r?.blocked ?? 0, color: "text-orange-600" },
    { label: "Waiting client", count: r?.waiting_client ?? 0, color: "text-blue-600" },
    { label: "Delayed", count: r?.delayed ?? 0, color: "text-red-600" },
  ];

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project operations</h2>
        <Button variant="outline" size="sm" asChild><Link to="/projects">All projects</Link></Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border">
        {buckets.map((b) => (
          <Link key={b.label} to="/projects" className="bg-card px-4 py-4 text-center hover:bg-muted/40 transition-colors">
            <p className={`text-2xl font-bold tabular-nums ${b.color}`}>{isLoading ? "…" : b.count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{b.label}</p>
          </Link>
        ))}
      </div>
      {(r?.items ?? []).length > 0 && (
        <ul className="divide-y divide-border">
          {r?.items.slice(0, 6).map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 text-sm">
                <div>
                  <p className="font-medium">{p.project_name}</p>
                  <p className="text-xs text-muted-foreground">{p.client_name}</p>
                </div>
                <span className="text-xs text-muted-foreground">{p.risk_label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CeoExecutiveWidgets({ data, isLoading }: { data?: CeoCommandCenter; isLoading?: boolean }) {
  const w = data?.widgets;
  const pf = data?.pipeline_forecast;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Weekly wins</p>
        <ul className="space-y-1 text-xs">
          {(w?.weekly_wins ?? []).map((win, i) => (
            <li key={i} className="flex gap-1.5"><span className="text-emerald-600">✓</span>{win.label}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Burn rate</p>
        <p className="text-lg font-bold">{isLoading ? "…" : formatCompactInr(w?.burn_rate_cents ?? 0)}</p>
        <p className="text-[10px] text-muted-foreground">Monthly expenses</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2 flex items-center gap-1"><Calendar className="h-3 w-3" />Meetings</p>
        {(w?.calendar ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No milestones this week</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {w?.calendar.slice(0, 3).map((e, i) => (
              <li key={e.id ?? i}>{e.title} · {formatRelativeTime(e.starts_at)}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Client satisfaction</p>
        <p className="text-2xl font-bold">{w?.client_satisfaction ?? "—"}<span className="text-sm text-muted-foreground">/5</span></p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:col-span-2">
        <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Pending approvals</p>
        {(w?.pending_approvals ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing pending</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {w?.pending_approvals.map((a) => (
              <Button key={a.href} variant="secondary" size="sm" asChild>
                <Link to={a.href}>{a.kind}: {a.label}</Link>
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:col-span-2">
        <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Pipeline forecast</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div><p className="font-bold">{pf?.confidence_pct ?? 0}%</p><p className="text-muted-foreground">Confidence</p></div>
          <div><p className="font-bold">{formatCompactInr(pf?.expected_close_cents ?? 0)}</p><p className="text-muted-foreground">Expected close</p></div>
          <div><p className="font-bold">{formatCompactInr(pf?.average_deal_cents ?? 0)}</p><p className="text-muted-foreground">Avg deal</p></div>
        </div>
      </div>
    </div>
  );
}

type ChartRange = "7d" | "30d" | "quarter" | "year";

export function CeoChartsSection({ data, isLoading }: { data?: CeoCommandCenter; isLoading?: boolean }) {
  const [range, setRange] = useState<ChartRange>("year");
  const [fullscreen, setFullscreen] = useState(false);

  const chartData = useMemo(() => {
    if (!data) return [];
    if (range === "7d") return data.charts.daily_revenue.map((d) => ({ period: d.period, revenue: d.revenue, profit: d.profit }));
    const monthly = data.charts.revenue_trend.map((m) => ({ period: m.month, revenue: m.revenue }));
    if (range === "30d") return monthly.slice(-1);
    if (range === "quarter") return monthly.slice(-3);
    return monthly;
  }, [data, range]);

  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends</h2>
        <div className="flex gap-1">
          {(["7d", "30d", "quarter", "year"] as ChartRange[]).map((r) => (
            <Button key={r} variant={range === r ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setRange(r)}>
              {r === "7d" ? "7 days" : r === "30d" ? "30 days" : r === "quarter" ? "Quarter" : "Year"}
            </Button>
          ))}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen((f) => !f)}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="h-[220px] bg-muted/30 rounded animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height={fullscreen ? 400 : 220}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} width={44} />
            <Tooltip formatter={(v: number) => formatInr(v * 100)} />
            <Bar dataKey="revenue" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={14} />
            {"profit" in (chartData[0] ?? {}) && <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2} dot={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur p-6 overflow-auto">
        <div className="max-w-6xl mx-auto rounded-xl border bg-card p-5">{body}</div>
      </div>
    );
  }

  return <section className="rounded-xl border border-border bg-card p-5 shadow-sm">{body}</section>;
}

export function CeoScoreBreakdown({ data, isLoading }: { data?: CeoCommandCenter; isLoading?: boolean }) {
  const s = data?.business_score_breakdown;
  const dims = [
    { label: "Revenue", value: s?.revenue ?? 0 },
    { label: "Projects", value: s?.projects ?? 0 },
    { label: "Clients", value: s?.clients ?? 0 },
    { label: "Finance", value: s?.finance ?? 0 },
    { label: "Operations", value: s?.operations ?? 0 },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-4 w-4 text-amber-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business health score</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {dims.map((d) => (
          <div key={d.label} className="text-center rounded-lg bg-muted/30 px-2 py-3">
            <p className="text-xl font-bold tabular-nums">{isLoading ? "…" : `${d.value}%`}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{d.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
