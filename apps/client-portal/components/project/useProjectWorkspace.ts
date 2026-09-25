"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useWorkspace, type TaskProgress } from "@/lib/workspace";
import { deriveHealth, type HealthLevel } from "@/components/ui";

export type ProjectPerson = { id: string; name: string; role: string };

export type ProjectDetail = {
  id: string;
  name: string;
  status: string;
  progress_pct: number;
  current_phase: string | null;
  start_date: string | null;
  target_end_date: string | null;
  completed_at: string | null;
  live_url: string | null;
  updated_at: string;
  health: HealthLevel;
  project_manager?: ProjectPerson | null;
};

export type Milestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  completion_pct: number;
};

export type FileRow = {
  id: string;
  name: string;
  content_type: string | null;
  size_bytes: number;
  folder_id: string | null;
  folder_name: string | null;
  uploaded_by_client: boolean;
  created_at: string;
};

export type TimelineEvent = {
  id: string;
  title: string;
  body?: string | null;
  created_at: string;
  event_type: string;
  actor_name?: string | null;
};

export type TeamMember = {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  role_label?: string | null;
  is_manager?: boolean;
};

export type ClientTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_at: string | null;
};

export function nameFromEmail(e: string) {
  return e.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useProjectWorkspace() {
  const router = useRouter();
  const { selectedProjectId, loading: wsLoading, taskProgressFor, refresh } = useWorkspace();
  const projectId = selectedProjectId;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    const r = await api<{ tasks: ClientTask[]; progress: TaskProgress }>(`/projects/${projectId}/tasks`);
    setTasks(r.tasks);
    setTaskProgress(r.progress);
  }, [projectId]);

  useEffect(() => {
    if (wsLoading) return;
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api<{ project: Omit<ProjectDetail, "health"> }>(`/projects/${projectId}`).then((r) => {
        const p = r.project;
        setProject({ ...p, health: deriveHealth(p) });
      }),
      api<{ milestones: Milestone[] }>(`/projects/${projectId}/milestones`).then((r) => setMilestones(r.milestones)),
      api<{ files: FileRow[] }>(`/projects/${projectId}/files`).then((r) => setFiles(r.files)),
      api<{ timeline: TimelineEvent[] }>(`/projects/${projectId}/timeline`).then((r) => setTimeline(r.timeline)),
      api<{ team: TeamMember[] }>(`/projects/${projectId}/team`).then((r) => setTeam(r.team)),
      loadTasks(),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, wsLoading, loadTasks]);

  // Live task updates — poll every 30s
  useEffect(() => {
    if (!projectId || wsLoading) return;
    const t = setInterval(() => {
      loadTasks().catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, [projectId, wsLoading, loadTasks]);

  useEffect(() => {
    if (!projectId) return;
    const cached = taskProgressFor(projectId);
    if (cached) setTaskProgress(cached);
  }, [projectId, taskProgressFor]);

  useEffect(() => {
    if (!wsLoading && !projectId) router.replace("/projects");
  }, [wsLoading, projectId, router]);

  async function refetchFiles() {
    if (!projectId) return;
    const r = await api<{ files: FileRow[] }>(`/projects/${projectId}/files`);
    setFiles(r.files);
  }

  return {
    projectId,
    project,
    milestones,
    files,
    timeline,
    team,
    tasks,
    taskProgress,
    loading: wsLoading || loading,
    refetchFiles,
    refetchTasks: loadTasks,
    refreshWorkspace: refresh,
  };
}
