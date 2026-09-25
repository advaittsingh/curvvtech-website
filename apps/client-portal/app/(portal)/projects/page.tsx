"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { TaskProgressSummary } from "@/components/project/TaskProgressSummary";
import {
  Card,
  HealthPill,
  PageHeader,
  Empty,
  Ring,
  Skeleton,
  deriveHealth,
  formatDate,
} from "@/components/ui";

type Project = {
  id: string;
  name: string;
  status: string;
  progress_pct: number;
  target_end_date: string | null;
  current_phase: string | null;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { taskProgressFor, setSelectedProjectId } = useWorkspace();

  useEffect(() => {
    const load = () =>
      api<{ projects: Project[] }>("/projects")
        .then((r) => setProjects(r.projects))
        .finally(() => setLoading(false));
    load();
    const poll = setInterval(load, 30_000);
    return () => clearInterval(poll);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="My projects" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-44" /><Skeleton className="h-44" />
        </div>
      </div>
    );
  }

  return (
    <div className="cp-animate">
      <PageHeader title="My projects" subtitle="Every project you're working on with curvvtech — each listed separately." />

      {projects.length === 0 ? (
        <Empty title="No projects yet" hint="Your projects will appear here once your team sets them up." icon={FolderKanban} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((p) => {
            const health = deriveHealth(p);
            const tp = taskProgressFor(p.id);
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                onClick={() => setSelectedProjectId(p.id)}
              >
                <Card interactive className="h-full p-0 overflow-hidden group">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-lg truncate group-hover:text-[var(--brand)] transition">{p.name}</div>
                        <div className="text-sm text-[var(--muted)] mt-0.5 capitalize">{p.current_phase ?? p.status.replace(/_/g, " ")}</div>
                      </div>
                      <Ring value={p.progress_pct} size={52} stroke={5}>
                        <span className="text-xs font-bold">{p.progress_pct}%</span>
                      </Ring>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <HealthPill level={health} />
                    </div>
                    <div className="mt-4">
                      <TaskProgressSummary progress={tp ?? null} projectId={p.id} compact showBar={false} />
                    </div>
                    <div className="flex items-center justify-between mt-4 text-xs text-[var(--muted)]">
                      <span>{p.target_end_date ? `Delivery ${formatDate(p.target_end_date)}` : "Delivery TBD"}</span>
                      <span className="flex items-center gap-1 font-medium text-[var(--text)] group-hover:gap-2 transition-all">
                        Open <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
