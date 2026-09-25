import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Progress } from "@/components/ui/progress";
import type { ProjectAnalytics } from "../project-schemas";
import { ProjectPanelError } from "./ProjectPanelError";

type Props = {
  projectId: string;
  fallback?: ProjectAnalytics | null;
};

export function ProjectAnalyticsPanel({ projectId, fallback }: Props) {
  const api = useAdminApi();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "projects", projectId, "analytics"],
    queryFn: () => api.projects.analytics(projectId) as Promise<ProjectAnalytics>,
    enabled: Boolean(projectId),
    retry: 1,
  });

  const resolved = data ?? fallback ?? null;
  const usingFallback = Boolean(fallback && !data);

  if (isLoading && !resolved) return <div className="h-48 rounded-xl bg-muted/30 animate-pulse" />;

  if (!resolved) {
    return (
      <ProjectPanelError
        title="Analytics unavailable"
        message={error instanceof Error ? error.message : "Could not load analytics from the server."}
        onRetry={() => void refetch()}
      />
    );
  }

  const milestoneProgress = Array.isArray(resolved.milestone_progress) ? resolved.milestone_progress : [];
  const burndown = Array.isArray(resolved.burndown) ? resolved.burndown : [];
  const velocity = Array.isArray(resolved.velocity) ? resolved.velocity : [];
  const revenueTrend = Array.isArray(resolved.revenue_trend) ? resolved.revenue_trend : [];
  const profitTrend = Array.isArray(resolved.profit_trend) ? resolved.profit_trend : [];

  return (
    <div className="space-y-4">
      {usingFallback && (
        <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
          Showing analytics from project task and milestone data{isError ? " — live charts unavailable" : ""}.
          {isError && (
            <button type="button" className="ml-2 text-primary hover:underline" onClick={() => void refetch()}>
              {isFetching ? "Retrying…" : "Retry"}
            </button>
          )}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <Stat label="Completion" value={`${resolved.completion_pct}%`} />
        <Stat label="Milestones" value={`${resolved.milestone_pct}%`} />
        <Stat label="Tasks" value={`${resolved.tasks_done}/${resolved.tasks_total}`} />
        <Stat label="Time" value={`${resolved.time_spent_hours}h / ${resolved.time_estimated_hours}h`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Burndown">
          {burndown.length === 0 ? (
            <Empty label={usingFallback ? "Burndown loads from API" : "No data"} />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={burndown}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="remaining" stroke="#6366f1" strokeWidth={2} dot={false} name="Remaining" />
                <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="4 4" dot={false} name="Ideal" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Velocity (tasks/week)">
          {velocity.length === 0 ? (
            <Empty label={usingFallback ? "Velocity loads from API" : "No data"} />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={velocity}>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Bar dataKey="completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Revenue over time">
          {revenueTrend.length === 0 ? (
            <Empty label={usingFallback ? "Revenue trend loads from API" : "No data"} />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={revenueTrend}>
                <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: number) => `₹${(v / 100).toLocaleString("en-IN")}`} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Profit trend">
          {profitTrend.length === 0 ? (
            <Empty label={usingFallback ? "Profit trend loads from API" : "No data"} />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={profitTrend}>
                <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: number) => `₹${(v / 100).toLocaleString("en-IN")}`} />
                <Line type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <Panel title="Milestone progress">
        <div className="space-y-3">
          {milestoneProgress.length === 0 ? (
            <p className="text-xs text-muted-foreground">No milestones defined.</p>
          ) : milestoneProgress.map((m, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{m.title}</span>
                <span className="text-muted-foreground">{m.pct}% · {m.status}</span>
              </div>
              <Progress value={m.pct} className="h-1.5" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</p>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">{label}</div>;
}
