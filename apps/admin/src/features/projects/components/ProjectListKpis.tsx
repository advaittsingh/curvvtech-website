import { motion } from "framer-motion";
import type { ProjectListStats } from "../project-schemas";
import { formatInr } from "../project-schemas";

type Props = { stats: ProjectListStats | null | undefined; loading?: boolean };

export function ProjectListKpis({ stats, loading }: Props) {
  const items = [
    { label: "Total projects", value: stats?.total ?? 0, format: "number" as const },
    { label: "Active", value: stats?.active ?? 0, format: "number" as const },
    { label: "In progress", value: stats?.in_progress ?? 0, format: "number" as const },
    { label: "Completed", value: stats?.completed ?? 0, format: "number" as const },
    { label: "Total budget", value: stats?.total_budget_cents ?? 0, format: "currency" as const },
    { label: "Collected", value: stats?.total_collected_cents ?? 0, format: "currency" as const, accent: true },
    { label: "Outstanding", value: stats?.total_pending_cents ?? 0, format: "currency" as const },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className={`font-semibold mt-0.5 text-sm ${item.accent ? "text-emerald-600" : ""} ${loading ? "animate-pulse text-muted-foreground" : ""}`}>
            {loading ? "—" : item.format === "currency" ? formatInr(item.value) : item.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
