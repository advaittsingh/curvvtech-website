"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { HealthLevel } from "@/components/ui";

export type WorkspaceProject = {
  id: string;
  name: string;
  status: string;
  progress_pct: number;
  current_phase: string | null;
  target_end_date: string | null;
  health?: HealthLevel;
  updated_at?: string;
};

export type WorkspaceTeamMember = {
  id: string;
  email: string;
  role: string;
};

export type TaskProgress = {
  project_id: string;
  total: number;
  done: number;
  remaining: number;
  client_visible_total: number;
  client_visible_open: number;
};

const STORAGE_KEY = "curvvtech_portal_selected_project";

type WorkspaceData = {
  primaryProject: WorkspaceProject | null;
  selectedProject: WorkspaceProject | null;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  projects: WorkspaceProject[];
  taskProgress: TaskProgress[];
  taskProgressFor: (projectId: string) => TaskProgress | undefined;
  team: WorkspaceTeamMember[];
  lastSyncedAt: string | null;
  loading: boolean;
  refresh: () => void;
};

const WorkspaceContext = createContext<WorkspaceData>({
  primaryProject: null,
  selectedProject: null,
  selectedProjectId: null,
  setSelectedProjectId: () => {},
  projects: [],
  taskProgress: [],
  taskProgressFor: () => undefined,
  team: [],
  lastSyncedAt: null,
  loading: true,
  refresh: () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [primaryProject, setPrimaryProject] = useState<WorkspaceProject | null>(null);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
  const [team, setTeam] = useState<WorkspaceTeamMember[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);

  const setSelectedProjectId = useCallback((id: string) => {
    setSelectedProjectIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api<{
        primary_project: WorkspaceProject | null;
        projects: WorkspaceProject[];
        task_progress?: TaskProgress[];
        team: WorkspaceTeamMember[];
        last_synced_at: string | null;
      }>("/workspace")
        .then((r) => {
          if (cancelled) return;
          const list = r.projects ?? [];
          setPrimaryProject(r.primary_project);
          setProjects(list);
          setTaskProgress(r.task_progress ?? []);
          setTeam(r.team ?? []);
          setLastSyncedAt(r.last_synced_at);

          setSelectedProjectIdState((current) => {
            if (current && list.some((p) => p.id === current)) return current;
            let saved: string | null = null;
            try {
              saved = localStorage.getItem(STORAGE_KEY);
            } catch {
              saved = null;
            }
            const validSaved = saved && list.some((p) => p.id === saved) ? saved : null;
            return validSaved ?? r.primary_project?.id ?? list[0]?.id ?? null;
          });
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

    load();
    const poll = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [tick]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? primaryProject,
    [projects, selectedProjectId, primaryProject],
  );

  const taskProgressFor = useCallback(
    (projectId: string) => taskProgress.find((t) => t.project_id === projectId),
    [taskProgress],
  );

  return (
    <WorkspaceContext.Provider
      value={{
        primaryProject,
        selectedProject: selectedProject ?? null,
        selectedProjectId: selectedProject?.id ?? null,
        setSelectedProjectId,
        projects,
        taskProgress,
        taskProgressFor,
        team,
        lastSyncedAt,
        loading,
        refresh: () => setTick((t) => t + 1),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
