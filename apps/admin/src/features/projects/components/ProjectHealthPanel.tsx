import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { HealthBreakdown, ProjectRecord } from "../project-schemas";
import { healthBg, healthColor } from "../project-schemas";

const DIMENSIONS: { key: keyof HealthBreakdown; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "budget", label: "Budget" },
  { key: "tasks", label: "Tasks" },
  { key: "communication", label: "Communication" },
  { key: "payments", label: "Payments" },
];

type Props = {
  breakdown: HealthBreakdown | null | undefined;
  project?: ProjectRecord | null;
  compact?: boolean;
};

function fallbackBreakdown(project: ProjectRecord): HealthBreakdown {
  const progress = Number(project.progress_pct ?? 0);
  const collected = Number(project.collected_cents ?? 0);
  const budget = Number(project.budget_cents ?? 0);
  const collectionPct = budget > 0 ? Math.round((collected / budget) * 100) : 0;
  const timeline = progress;
  const budgetScore = collectionPct >= 80 ? 90 : collectionPct >= 50 ? 70 : 50;
  const overall = Math.round((timeline + budgetScore + progress) / 3);
  return {
    timeline,
    budget: budgetScore,
    tasks: progress,
    communication: 70,
    payments: collectionPct,
    overall,
  };
}

export function ProjectHealthPanel({ breakdown, project, compact }: Props) {
  const data = breakdown ?? (project ? fallbackBreakdown(project) : null);

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse h-32" />
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card", compact ? "p-3" : "p-4")}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Project health</p>
          <p className="text-xs text-muted-foreground mt-0.5">Calculated from live project data</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-muted-foreground">Overall</p>
          <p className={cn("text-3xl font-bold tabular-nums", healthColor(data.overall))}>
            {data.overall}%
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {DIMENSIONS.map((dim, i) => (
          <motion.div
            key={dim.key}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{dim.label}</span>
              <span className="font-semibold tabular-nums">{data[dim.key]}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", healthBg(data[dim.key]))}
                initial={{ width: 0 }}
                animate={{ width: `${data[dim.key]}%` }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
