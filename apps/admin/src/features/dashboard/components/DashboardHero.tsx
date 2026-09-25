import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderKanban, IndianRupee, Plus, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardOverview } from "../dashboard.types";
import { formatCompactInr, formatInr, greetingName, QUICK_ACTIONS, timeGreeting } from "../dashboard.utils";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  data?: DashboardOverview;
  userEmail?: string | null;
  isLoading?: boolean;
};

export function DashboardHero({ data, userEmail, isLoading }: Props) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const s = data?.today_snapshot;
  const revenueToday = s?.revenue_today_cents ?? 0;
  const change = s?.revenue_today_change_pct ?? 0;
  const up = change >= 0;
  const profitMonth = data?.revenue?.profit_this_month_cents ?? 0;

  const metrics = [
    {
      label: "Revenue today",
      value: formatInr(revenueToday),
      numeric: revenueToday,
      icon: IndianRupee,
      href: "/payments",
      accent: "border-emerald-500/30",
      badge: revenueToday > 0 ? `${up ? "+" : ""}${change}%` : null,
      badgeUp: up,
    },
    {
      label: "Collections",
      value: formatCompactInr(s?.collections_due_cents ?? 0),
      numeric: s?.collections_due_cents ?? 0,
      icon: Receipt,
      href: "/invoices?status=sent",
      accent: "border-amber-500/30",
      badge: s?.collections_due_count ? `${s.collections_due_count} due` : null,
    },
    {
      label: "Projects",
      value: `${s?.active_projects ?? 0} active`,
      numeric: s?.active_projects ?? 0,
      icon: FolderKanban,
      href: "/projects",
      accent: "border-violet-500/30",
      badge: s?.projects_nearing_completion ? `${s.projects_nearing_completion} nearing` : null,
    },
    {
      label: "Profit this month",
      value: formatCompactInr(profitMonth),
      numeric: profitMonth,
      icon: Wallet,
      href: "/payments",
      accent: "border-blue-500/30",
      badge: null,
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Executive Command Center</p>
          <h1 className="text-2xl font-bold mt-1">
            {timeGreeting()}, {greetingName(userEmail)} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.filter((a) => a.primary).map((a) => (
            <Button key={a.href} size="sm" asChild>
              <Link to={a.href}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {a.label}
              </Link>
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/ceo">CEO view</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/payments">Payments</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/tasks">Tasks</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={m.href}
              className={`block rounded-xl bg-background/80 border ${m.accent} px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <m.icon className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{m.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold tabular-nums">
                  {isLoading ? "…" : typeof m.numeric === "number" && m.label !== "Projects" ? (
                    <AnimatedNumber value={m.numeric} format={() => m.value} />
                  ) : (
                    m.value
                  )}
                </p>
                {!isLoading && m.badge && (
                  <span className={badgeClass(m.badgeUp)}>
                    {m.badgeUp === true && <TrendingUp className="h-2.5 w-2.5" />}
                    {m.badgeUp === false && <TrendingDown className="h-2.5 w-2.5" />}
                    {m.badge}
                  </span>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function badgeClass(up?: boolean) {
  if (up === true) return "inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700";
  if (up === false) return "inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-700";
  return "text-[9px] font-medium text-muted-foreground";
}

export function TodayBusinessStrip({ data, isLoading }: { data?: DashboardOverview; isLoading?: boolean }) {
  const s = data?.today_snapshot;
  const items = [
    {
      label: "New leads",
      value: s?.new_leads_today ?? "—",
      sub: s ? `${s.qualified_leads} qualified` : "",
      dot: "bg-blue-500",
      href: "/leads",
    },
    {
      label: "Follow-ups",
      value: s?.follow_ups_due ?? "—",
      sub: s?.meetings_today ? `${s.meetings_today} due today` : "Pending outreach",
      dot: "bg-orange-500",
      href: "/leads",
    },
    {
      label: "Tasks due",
      value: s?.tasks_due_today ?? "—",
      sub: s?.overdue_invoices ? `${s.overdue_invoices} overdue invoices` : "On schedule",
      dot: "bg-rose-500",
      href: "/tasks",
    },
    {
      label: "Team capacity",
      value: data ? `${data.team_utilization_pct}%` : "—",
      sub: "Delivery utilization",
      dot: "bg-slate-500",
      href: "/team",
    },
  ];

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Today&apos;s pulse</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to={item.href}
              className="block rounded-xl border border-border bg-card p-3 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
              </div>
              <p className="text-lg font-bold tabular-nums">{isLoading ? "…" : item.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{isLoading ? "" : item.sub}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
