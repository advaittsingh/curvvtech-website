import { motion } from "framer-motion";
import {
  Calendar,
  FileText,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectProgressRing } from "./ProjectProgressRing";
import type { ProjectRecord, ProjectSummary } from "../project-schemas";
import { formatInr, deriveProgressPct } from "../project-schemas";

type Props = {
  project: ProjectRecord;
  summary: ProjectSummary | null | undefined;
  onCreateInvoice?: () => void;
  onGeneratePlan?: () => void;
  onUpload?: () => void;
  onTabChange?: (tab: string) => void;
};

export function ProjectWorkspaceStrip({
  project,
  summary,
  onCreateInvoice,
  onGeneratePlan,
  onUpload,
  onTabChange,
}: Props) {
  const color = project.color ?? "#6366f1";
  const breakdown = summary?.health_breakdown;
  const progress = deriveProgressPct(project, summary);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-3">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
      >
        <ProjectProgressRing value={progress} size={52} color={color} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Progress</p>
          <p className="text-xl font-bold">{progress}%</p>
        </div>
        {breakdown && (
          <div className="text-right border-l border-border pl-3">
            <p className="text-[10px] uppercase text-muted-foreground">Health</p>
            <p className="text-xl font-bold text-primary">{breakdown.overall}%</p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl border border-border bg-card p-3 grid grid-cols-3 gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => onTabChange?.("finance")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onTabChange?.("finance")}
      >
        <Fin label="Budget" value={formatInr(summary?.budget_cents ?? project.budget_cents)} />
        <Fin label="Collected" value={formatInr(summary?.collected_cents)} accent />
        <Fin label="Pending" value={formatInr(summary?.pending_cents)} warn={Boolean(summary?.pending_cents)} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 min-w-0"
      >
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase text-muted-foreground">Client</p>
          <p className="font-semibold text-sm truncate">{project.client_company ?? project.client_name ?? "—"}</p>
          {summary?.days_since_last_contact != null && summary.days_since_last_contact > 3 && (
            <p className="text-[10px] text-amber-600">No contact for {summary.days_since_last_contact}d</p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-border bg-card p-2 flex flex-wrap lg:flex-col gap-1.5"
      >
        <QuickBtn icon={FileText} label="Invoice" onClick={onCreateInvoice} />
        <QuickBtn icon={Upload} label="Upload" onClick={onUpload} />
        <QuickBtn icon={Calendar} label="Timeline" onClick={() => onTabChange?.("milestones")} />
        <QuickBtn icon={Sparkles} label="AI Plan" onClick={onGeneratePlan} />
      </motion.div>
    </div>
  );
}

function Fin({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div>
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold truncate ${accent ? "text-emerald-700" : warn ? "text-amber-700" : ""}`}>{value}</p>
    </div>
  );
}

function QuickBtn({ icon: Icon, label, onClick }: { icon: typeof FileText; label: string; onClick?: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs justify-start flex-1 lg:flex-none" onClick={onClick}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
