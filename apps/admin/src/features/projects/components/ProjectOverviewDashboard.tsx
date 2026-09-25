import { ExternalLink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCharts } from "./ProjectCharts";
import { ProjectUnifiedTimeline } from "./ProjectUnifiedTimeline";
import { ProjectProgressRing } from "./ProjectProgressRing";
import type {
  ProjectActivity,
  ProjectFile,
  ProjectInvoice,
  ProjectMember,
  ProjectMilestone,
  ProjectNote,
  ProjectRecord,
  ProjectSummary,
  ProjectTask,
} from "../project-schemas";
import { formatInr, healthColor, resolveIntel, deriveProgressPct } from "../project-schemas";

type Props = {
  project: ProjectRecord;
  summary: ProjectSummary | null | undefined;
  milestones: ProjectMilestone[];
  tasks: ProjectTask[];
  invoices: ProjectInvoice[];
  files: ProjectFile[];
  notes: ProjectNote[];
  members: ProjectMember[];
  activity: ProjectActivity[];
  onNavigateFiles: () => void;
  onNavigateInvoices: () => void;
};

export function ProjectOverviewDashboard({
  project,
  summary,
  milestones,
  tasks,
  invoices,
  files,
  notes,
  members,
  activity,
  onNavigateFiles,
  onNavigateInvoices,
}: Props) {
  const intel = resolveIntel(project, summary);
  const health = summary?.health_score ?? 70;
  const color = project.color ?? "#6366f1";
  const progress = deriveProgressPct(project, summary);
  const recentNotes = notes.slice(0, 3);
  const recentFiles = files.slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[1fr_280px] gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <ProjectProgressRing value={progress} size={72} stroke={5} color={color} />
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Budget" value={formatInr(summary?.budget_cents ?? project.budget_cents)} />
              <Stat label="Collected" value={formatInr(summary?.collected_cents)} accent />
              <Stat label="Pending" value={formatInr(summary?.pending_cents)} />
              <Stat label="Profit" value={formatInr(summary?.profit_cents)} />
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[10px] uppercase text-muted-foreground">Health</p>
              <p className={`text-2xl font-bold ${healthColor(health)}`}>{health}</p>
            </div>
          </div>
          {project.live_url && (
            <a href={project.live_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline">
              <ExternalLink className="h-3 w-3" /> {project.live_url}
            </a>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI insight</p>
          <p className="text-sm leading-relaxed whitespace-pre-line line-clamp-6">{intel.ai_summary}</p>
          <div className="flex gap-2 text-xs pt-1">
            <BadgePill label="Timeline" value={intel.timeline_risk ?? "—"} />
            <BadgePill label="Budget" value={intel.budget_risk ?? "—"} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Timeline</h3>
          </div>
          <ProjectUnifiedTimeline milestones={milestones} invoices={invoices} activity={activity} />
        </section>

        <div className="space-y-3">
          <MiniPanel title="Milestones" action={`${milestones.filter((m) => m.completed_at).length}/${milestones.length}`}>
            {milestones.length === 0 ? (
              <p className="text-xs text-muted-foreground">No milestones yet.</p>
            ) : (
              <ul className="space-y-2">
                {milestones.slice(0, 5).map((m) => (
                  <li key={m.id} className="flex justify-between text-xs gap-2">
                    <span className={m.completed_at ? "line-through text-muted-foreground" : "font-medium"}>{m.title}</span>
                    <span className="text-muted-foreground shrink-0">{m.completion_pct ? `${m.completion_pct}%` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </MiniPanel>

          <MiniPanel title="Team" action={`${members.length} members`}>
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground">No team assigned.</p>
            ) : (
              <ul className="space-y-1">
                {members.slice(0, 4).map((m) => (
                  <li key={m.user_id} className="text-xs">
                    <span className="font-medium">{m.email?.split("@")[0]}</span>
                    <span className="text-muted-foreground"> · {m.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </MiniPanel>

          <MiniPanel title="Recent notes">
            {recentNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentNotes.map((n) => (
                  <li key={n.id} className="text-xs line-clamp-2">{n.body}</li>
                ))}
              </ul>
            )}
          </MiniPanel>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <MiniPanel title="Recent files" action={<Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={onNavigateFiles}><Upload className="h-3 w-3" /> Upload</Button>}>
          {recentFiles.length === 0 ? (
            <p className="text-xs text-muted-foreground">No files uploaded — drag & drop in Files tab.</p>
          ) : (
            <ul className="space-y-1">
              {recentFiles.map((f) => (
                <li key={f.id} className="text-xs truncate">{f.name}</li>
              ))}
            </ul>
          )}
        </MiniPanel>
        <MiniPanel title="Invoices" action={<Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onNavigateInvoices}>View all</Button>}>
          <p className="text-xs text-muted-foreground">{invoices.length} invoices · {summary?.collection_pct ?? 0}% collected</p>
          <ul className="mt-2 space-y-1">
            {invoices.slice(0, 3).map((i) => (
              <li key={i.id} className="text-xs flex justify-between">
                <span>{i.invoice_number}</span>
                <span>{formatInr(i.total_cents)}</span>
              </li>
            ))}
          </ul>
        </MiniPanel>
      </div>

      <ProjectCharts summary={summary} invoices={invoices} tasks={tasks} />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className={`font-semibold ${accent ? "text-emerald-700" : ""}`}>{value}</p>
    </div>
  );
}

function BadgePill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

function MiniPanel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
        {typeof action === "string" ? <span className="text-xs text-muted-foreground">{action}</span> : action}
      </div>
      {children}
    </div>
  );
}
