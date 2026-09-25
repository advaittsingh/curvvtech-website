import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { DashboardOverview } from "../dashboard.types";
import { formatCompactInr, STAGE_LABELS } from "../dashboard.utils";
import { DashboardCard } from "./DashboardCard";

type Props = { data?: DashboardOverview; isLoading?: boolean };

const STAGE_COLORS = [
  "bg-slate-200 dark:bg-slate-700",
  "bg-blue-200 dark:bg-blue-900/60",
  "bg-violet-200 dark:bg-violet-900/60",
  "bg-amber-200 dark:bg-amber-900/60",
  "bg-emerald-200 dark:bg-emerald-900/60",
];

export function LeadFunnelWidget({ data, isLoading }: Props) {
  const stages = data?.lead_funnel ?? [];
  const max = Math.max(...stages.map((s) => s.count), 1);
  const pipelineValue = data?.pipeline?.pipeline_value_cents ?? 0;

  return (
    <DashboardCard title="Lead funnel" description="Stage conversion · compact view">
      {isLoading ? (
        <div className="h-40 bg-muted/30 animate-pulse rounded-lg" />
      ) : stages.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <p>No leads in pipeline</p>
          <Link to="/leads" className="text-primary text-xs font-medium mt-2 inline-block">
            Create lead →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col items-stretch gap-0.5">
            {stages.map((stage, i) => {
              const widthPct = Math.max(35, Math.round((stage.count / max) * 100));
              const dropOff =
                i > 0 && stages[i - 1].count > 0
                  ? Math.round(((stages[i - 1].count - stage.count) / stages[i - 1].count) * 100)
                  : 0;
              return (
                <motion.div
                  key={stage.stage}
                  initial={{ opacity: 0, scaleX: 0.9 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`relative rounded-md px-2 py-1.5 text-center transition-all hover:brightness-95 ${STAGE_COLORS[i % STAGE_COLORS.length]}`}
                    style={{
                      width: `${widthPct}%`,
                      minWidth: "5.5rem",
                      clipPath: i < stages.length - 1 ? "polygon(4% 0, 96% 0, 100% 100%, 0% 100%)" : undefined,
                    }}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
                      {STAGE_LABELS[stage.stage] ?? stage.stage}
                    </p>
                    <p className="text-base font-bold leading-tight">{stage.count}</p>
                    {stage.conversion_pct > 0 && i < stages.length - 1 && (
                      <p className="text-[8px] text-muted-foreground">{stage.conversion_pct}% →</p>
                    )}
                    {dropOff > 0 && (
                      <p className="text-[8px] text-red-600/80">-{dropOff}% drop</p>
                    )}
                  </div>
                  {i < stages.length - 1 && (
                    <div className="h-1 w-px bg-border" />
                  )}
                </motion.div>
              );
            })}
          </div>
          {pipelineValue > 0 && (
            <p className="text-[10px] text-center text-muted-foreground pt-1">
              Expected pipeline value {formatCompactInr(pipelineValue)}
            </p>
          )}
        </div>
      )}
      <Link to="/leads" className="inline-block text-xs font-medium text-primary mt-3 hover:underline">
        View pipeline →
      </Link>
    </DashboardCard>
  );
}
