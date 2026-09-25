import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Calendar, Target, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { DashboardOverview } from "../dashboard.types";
import { formatCompactInr, formatRelativeTime } from "../dashboard.utils";
import { DashboardCard } from "./DashboardCard";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = { data?: DashboardOverview; isLoading?: boolean };

const CARD_CLASS = "h-full min-h-[7.5rem] flex flex-col";

export function DashboardSecondaryWidgets({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 items-stretch">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const w = data.widgets;
  const goal = w.weekly_goal ?? { target_cents: 20000000, current_cents: 0, progress_pct: 0 };
  const completion = w.project_completion ?? { completed: 0, in_progress: 0, delayed: 0 };
  const notifications = w.notifications ?? [];
  const calendar = w.calendar_events ?? [];

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Insights & signals</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 items-stretch">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="h-full">
          <DashboardCard className={CARD_CLASS}>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Target className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Revenue goal</span>
            </div>
            <p className="text-lg font-bold tabular-nums">
              <AnimatedNumber value={goal.progress_pct} format={(n) => `${n}%`} />
            </p>
            <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress_pct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-auto pt-1.5">
              {formatCompactInr(goal.current_cents)} / {formatCompactInr(goal.target_cents)}
            </p>
          </DashboardCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="h-full"
        >
          <DashboardCard href="/projects" className={CARD_CLASS}>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Projects</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center flex-1 content-center">
              <div>
                <p className="text-base font-bold text-emerald-600">{completion.completed}</p>
                <p className="text-[9px] text-muted-foreground">Done</p>
              </div>
              <div>
                <p className="text-base font-bold">{completion.in_progress}</p>
                <p className="text-[9px] text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-base font-bold text-red-600">{completion.delayed}</p>
                <p className="text-[9px] text-muted-foreground">Late</p>
              </div>
            </div>
          </DashboardCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="col-span-2 h-full"
        >
          <DashboardCard className={CARD_CLASS}>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Calendar</span>
            </div>
            {calendar.length === 0 ? (
              <p className="text-xs text-muted-foreground">No milestones this week</p>
            ) : (
              <ul className="space-y-2 flex-1">
                {calendar.slice(0, 3).map((e) => (
                  <li key={e.id} className="flex items-start gap-2 text-xs">
                    <Clock className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {e.project_name} · {formatRelativeTime(e.starts_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="col-span-2 h-full"
        >
          <DashboardCard className={CARD_CLASS}>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Bell className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Notifications</span>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground">No new notifications</p>
            ) : (
              <ul className="space-y-1.5 flex-1">
                {notifications.slice(0, 3).map((n, i) => (
                  <li key={i}>
                    <Link to={n.href} className="flex items-start gap-2 text-xs hover:text-primary group">
                      <AlertCircle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium truncate group-hover:underline">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </motion.div>
      </div>
    </section>
  );
}
