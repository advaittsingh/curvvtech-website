"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import {
  Breadcrumbs,
  PageHeader,
  Card,
  Progress,
  Skeleton,
  Empty,
  Badge,
  cn,
  formatDate,
} from "@/components/ui";
import { useProjectWorkspace } from "@/components/project/useProjectWorkspace";

/** Parse the milestone's *weight* (its share of the project) from the title,
 *  e.g. "Advance Payment (50%)" -> 50. Falls back to null when not present. */
function parseWeight(title: string): number | null {
  const m = title.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

export default function ProjectMilestonesPage() {
  const { project, milestones, loading } = useProjectWorkspace();

  if (loading) return <Skeleton className="h-64" />;
  if (!project) return null;

  return (
    <div className="cp-animate">
      <Breadcrumbs items={[{ label: "Project", href: "/project" }, { label: "Milestones" }]} />
      <PageHeader title="Milestones" subtitle="Your delivery roadmap — what's done, what's in progress, and what's next." />

      {milestones.length === 0 ? (
        <Empty
          title="Milestones coming soon"
          hint="Your project manager will break the work into milestones here. You'll see each phase's weight, progress, and due date."
          icon={Circle}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 sm:p-6">
            {milestones.map((m, i) => {
              const done = m.status === "completed";
              const active = m.status === "in_progress";
              const Icon = done ? CheckCircle2 : active ? Clock : Circle;
              const weight = parseWeight(m.title);
              // Bar length reflects the milestone's *weight* (its proportional
              // share of the project), so a 20% phase never looks like 40%.
              const barValue = weight ?? m.completion_pct ?? (done ? 100 : active ? 50 : 0);
              const last = i === milestones.length - 1;
              return (
                <div key={m.id} className="flex gap-4">
                  {/* Roadmap rail: node + connector */}
                  <div className="flex flex-col items-center">
                    <Icon
                      size={22}
                      className={cn(
                        "shrink-0",
                        done ? "text-[var(--ok)]" : active ? "text-[var(--warn)]" : "text-[var(--muted-2)]",
                      )}
                    />
                    {!last && (
                      <div
                        className={cn("w-0.5 flex-1 my-1", done ? "bg-[var(--ok)]/40" : "bg-[var(--border)]")}
                        style={{ minHeight: 28 }}
                      />
                    )}
                  </div>

                  <div className={cn("flex-1 min-w-0", last ? "pb-0" : "pb-6")}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("font-semibold", done && "text-[var(--muted)]")}>{m.title}</span>
                      <Badge status={m.status} />
                      {weight != null && (
                        <span className="text-xs font-semibold text-[var(--muted)] tabular-nums">{weight}% of project</span>
                      )}
                    </div>
                    {m.description && <p className="text-sm text-[var(--muted)] mt-1">{m.description}</p>}
                    <div className="mt-2.5 max-w-md">
                      <Progress
                        value={barValue}
                        tone={done ? "ok" : active ? "brand" : "muted"}
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
                        <span>{done ? "Completed" : active ? "In progress" : "Upcoming"}</span>
                        {m.due_at && <span>Due {formatDate(m.due_at)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
