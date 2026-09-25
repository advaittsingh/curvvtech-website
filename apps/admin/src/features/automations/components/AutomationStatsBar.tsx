import { CheckCircle2, Clock, PlayCircle, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutomationStats } from "../automations.utils";

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", accent)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function AutomationStatsBar({ stats }: { stats: AutomationStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard icon={Zap} label="Active Workflows" value={String(stats.active)} accent="bg-amber-100 text-amber-700" />
      <StatCard icon={PlayCircle} label="Runs Today" value={String(stats.runsToday)} accent="bg-blue-100 text-blue-700" />
      <StatCard
        icon={CheckCircle2}
        label="Success Rate"
        value={`${stats.successRate}%`}
        accent="bg-emerald-100 text-emerald-700"
      />
      <StatCard icon={XCircle} label="Failed" value={String(stats.failed)} accent="bg-red-100 text-red-700" />
      <StatCard
        icon={Clock}
        label="Time Saved"
        value={`${stats.timeSavedHrs} hrs`}
        accent="bg-violet-100 text-violet-700"
      />
    </div>
  );
}
