import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ExternalLink } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { ProjectProgressRing } from "./ProjectProgressRing";
import type { ProjectRecord, ProjectSummary } from "../project-schemas";
import { deriveProgressPct, formatInr } from "../project-schemas";

type Props = {
  project: ProjectRecord;
  summary: ProjectSummary | null | undefined;
  onFinanceClick?: () => void;
};

function progressColor(project: ProjectRecord, progress: number): string {
  if (project.status === "completed" || progress >= 100) return "#22c55e";
  if (progress >= 50) return "#14b8a6";
  return project.color ?? "#6366f1";
}

export function ProjectSummaryCards({ project, summary, onFinanceClick }: Props) {
  const api = useAdminApi();
  const progress = deriveProgressPct(project, summary);
  const health = summary?.health_breakdown?.overall ?? summary?.health_score ?? progress;
  const ringColor = progressColor(project, progress);

  const budget = summary?.budget_cents ?? project.budget_cents ?? 0;
  const collected = summary?.collected_cents ?? 0;
  const pending = summary?.pending_cents ?? 0;
  const collectionPct = summary?.collection_pct ?? (budget > 0 ? Math.round((collected / budget) * 100) : 100);
  const pendingPct = budget > 0 ? Math.round((pending / budget) * 100) : 0;

  const isComplete = project.status === "completed" || progress >= 100;
  const allPaid = pending <= 0 && collected > 0;

  const { data: client } = useQuery({
    queryKey: ["admin", "clients", project.client_id],
    queryFn: () => api.clients.get(project.client_id!),
    enabled: Boolean(project.client_id),
  });
  const c = client && typeof client === "object" && !("error" in client) ? (client as Record<string, unknown>) : null;
  const contactName = String(c?.name ?? c?.contact_name ?? project.client_name ?? project.client_company ?? "—");
  const email = String(c?.email ?? project.client_email ?? "—");
  const phone = String(c?.phone ?? "—");
  const initial = contactName.charAt(0).toUpperCase() || "?";

  return (
    <div className="grid lg:grid-cols-3 gap-3">
      {/* Progress card */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col min-h-[148px]">
        <div className="flex items-center gap-4 flex-1">
          <ProjectProgressRing value={progress} size={80} stroke={6} color={ringColor} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold tabular-nums">{progress}%</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Health</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-600">{health}%</p>
            </div>
          </div>
        </div>
        {isComplete && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>Project completed successfully</span>
          </div>
        )}
      </div>

      {/* Financial card */}
      <button
        type="button"
        onClick={onFinanceClick}
        className="rounded-xl border border-border bg-card p-4 flex flex-col min-h-[148px] text-left hover:bg-muted/20 transition-colors"
      >
        <div className="grid grid-cols-3 gap-2 flex-1">
          <FinCol label="Budget" value={formatInr(budget)} sub="Total" />
          <FinCol label="Collected" value={formatInr(collected)} sub={`${collectionPct}%`} accent="emerald" />
          <FinCol label="Pending" value={formatInr(pending)} sub={`${pendingPct}%`} accent="violet" />
        </div>
        {allPaid && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>All payments collected</span>
          </div>
        )}
      </button>

      {/* Client card */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col min-h-[148px]">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-11 w-11 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-lg font-semibold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base leading-tight">{contactName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Primary Contact</p>
            <p className="text-xs text-muted-foreground truncate mt-2" title={email}>{email}</p>
            <p className="text-xs text-muted-foreground truncate" title={phone}>{phone}</p>
          </div>
        </div>
        {project.client_id && (
          <Link
            to={`/clients/${project.client_id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/50 w-fit transition-colors"
          >
            View Client
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function FinCol({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "emerald" | "violet";
}) {
  const valueClass =
    accent === "emerald" ? "text-emerald-600" : accent === "violet" ? "text-violet-600" : "text-foreground";
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums truncate ${valueClass}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
