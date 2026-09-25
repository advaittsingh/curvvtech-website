import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { DashboardOverview } from "../dashboard.types";
import { DashboardCard } from "./DashboardCard";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = { data?: DashboardOverview; isLoading?: boolean };

const HEALTH_ITEMS = [
  { key: "on_track" as const, label: "Healthy", color: "bg-emerald-500" },
  { key: "at_risk" as const, label: "At risk", color: "bg-amber-500" },
  { key: "delayed" as const, label: "Delayed", color: "bg-red-500" },
  { key: "awaiting_client" as const, label: "Awaiting client", color: "bg-blue-500" },
];

export function ProjectHealthWidget({ data, isLoading }: Props) {
  const health = data?.project_health;
  const avgHealth = data?.projects_summary?.average_health_pct ?? 0;
  const total = health ? health.on_track + health.at_risk + health.delayed + health.awaiting_client : 0;
  const healthyCount = health?.on_track ?? 0;
  const healthyPct = total > 0 ? Math.round((healthyCount / total) * 100) : 0;

  return (
    <Link to="/projects" className="block group">
      <DashboardCard
        title="Project health"
        description="Click to open projects"
        className="group-hover:shadow-md group-hover:border-primary/20 transition-all h-full"
      >
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-4 pb-3 border-b border-border/60">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Average health</p>
                <p className="text-3xl font-bold text-emerald-600 tabular-nums">
                  <AnimatedNumber value={avgHealth} format={(n) => `${n}%`} />
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total projects</p>
                <p className="text-2xl font-bold tabular-nums">{total}</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-emerald-700">Healthy</span>
                <span className="font-bold tabular-nums">{healthyCount}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(healthyPct, healthyCount > 0 ? 12 : 0)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {HEALTH_ITEMS.map((item, i) => {
                const count = health?.[item.key] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="space-y-1"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-medium group-hover:text-primary transition-colors">{item.label}</span>
                      <span className="text-muted-foreground tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${item.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </DashboardCard>
    </Link>
  );
}
