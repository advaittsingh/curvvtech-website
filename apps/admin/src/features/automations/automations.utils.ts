import { getTrigger } from "./automations.constants";
import type {
  Workflow,
  WorkflowCategory,
  WorkflowDraft,
  WorkflowRun,
  WorkflowTemplate,
} from "./automations.types";

export function deriveCategory(wf: Workflow): WorkflowCategory {
  const explicit = wf.trigger_config?.category;
  if (explicit) return explicit;
  return getTrigger(wf.trigger_type)?.category ?? "custom";
}

/** Human label for a trigger/action snake_case key. */
export function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function runIsFailed(run: WorkflowRun): boolean {
  if (run.status === "failed" || run.status === "error") return true;
  const result = run.result;
  if (Array.isArray(result)) {
    return result.some((r) => r && typeof r === "object" && "error" in (r as object));
  }
  return false;
}

export function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export type AutomationStats = {
  active: number;
  runsToday: number;
  totalRuns: number;
  successRate: number;
  failed: number;
  timeSavedHrs: number;
};

/** ~90 seconds of manual work saved per successful automation run. */
const MINUTES_SAVED_PER_RUN = 1.5;

export function computeStats(workflows: Workflow[], runs: WorkflowRun[]): AutomationStats {
  const active = workflows.filter((w) => w.enabled).length;
  const runsToday = runs.filter((r) => isToday(r.createdAt)).length;
  const totalRuns = runs.length;
  const failed = runs.filter(runIsFailed).length;
  const succeeded = totalRuns - failed;
  const successRate = totalRuns > 0 ? Math.round((succeeded / totalRuns) * 1000) / 10 : 100;
  const timeSavedHrs = Math.round((succeeded * MINUTES_SAVED_PER_RUN) / 6) / 10;
  return { active, runsToday, totalRuns, successRate, failed, timeSavedHrs };
}

/** Count successful runs per workflow id. */
export function runCountByWorkflow(runs: WorkflowRun[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of runs) {
    if (!r.workflow_id) continue;
    map[r.workflow_id] = (map[r.workflow_id] ?? 0) + 1;
  }
  return map;
}

export function lastRunByWorkflow(runs: WorkflowRun[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of runs) {
    if (!r.workflow_id || !r.createdAt) continue;
    if (!map[r.workflow_id] || r.createdAt > map[r.workflow_id]) {
      map[r.workflow_id] = r.createdAt;
    }
  }
  return map;
}

export function workflowSuccessRate(runs: WorkflowRun[], workflowId: string): number {
  const own = runs.filter((r) => r.workflow_id === workflowId);
  if (own.length === 0) return 100;
  const failed = own.filter(runIsFailed).length;
  return Math.round(((own.length - failed) / own.length) * 100);
}

export function relativeTime(iso?: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Ordered list of node labels for a workflow's visual flow (trigger + actions). */
export function flowSteps(wf: Workflow): { label: string; kind: "trigger" | "action" }[] {
  const trigger = getTrigger(wf.trigger_type);
  const steps: { label: string; kind: "trigger" | "action" }[] = [
    { label: trigger?.label ?? humanize(wf.trigger_type), kind: "trigger" },
  ];
  const actions = [...(wf.actions ?? [])].sort((a, b) => a.step_order - b.step_order);
  for (const a of actions) {
    steps.push({ label: humanize(a.action_type), kind: "action" });
  }
  return steps;
}

export function emptyDraft(): WorkflowDraft {
  return {
    name: "",
    description: "",
    category: "custom",
    trigger_type: "",
    trigger_config: {},
    conditions: [],
    actions: [],
    enabled: true,
    retry_on_failure: false,
    max_retries: 3,
  };
}

export function templateToDraft(t: WorkflowTemplate): WorkflowDraft {
  return {
    name: t.name,
    description: t.description,
    category: t.category,
    trigger_type: t.trigger_type,
    trigger_config: { ...t.trigger_config },
    conditions: t.trigger_config.conditions ?? [],
    actions: t.actions.map((a) => ({ ...a, action_config: { ...a.action_config } })),
    enabled: true,
    retry_on_failure: false,
    max_retries: 3,
  };
}

export function workflowToDraft(wf: Workflow): WorkflowDraft {
  const cfg = wf.trigger_config ?? {};
  return {
    name: wf.name,
    description: cfg.description ?? "",
    category: deriveCategory(wf),
    trigger_type: wf.trigger_type,
    trigger_config: { ...cfg },
    conditions: cfg.conditions ?? [],
    actions: [...(wf.actions ?? [])]
      .sort((a, b) => a.step_order - b.step_order)
      .map((a) => ({ ...a, action_config: { ...(a.action_config ?? {}) } })),
    enabled: wf.enabled,
    retry_on_failure: Boolean(cfg.retry_on_failure),
    max_retries: Number(cfg.max_retries ?? 3),
  };
}

/** Convert a draft into the API payload the backend expects. */
export function draftToPayload(draft: WorkflowDraft) {
  const trigger_config = {
    ...draft.trigger_config,
    conditions: draft.conditions,
    description: draft.description,
    category: draft.category,
    retry_on_failure: draft.retry_on_failure,
    max_retries: draft.max_retries,
  };
  return {
    name: draft.name.trim() || "Untitled workflow",
    trigger_type: draft.trigger_type,
    trigger_config,
    enabled: draft.enabled,
    actions: draft.actions.map((a, i) => ({
      step_order: i,
      action_type: a.action_type,
      action_config: a.action_config ?? {},
    })),
  };
}

/** Export a workflow to a downloadable JSON blob. */
export function exportWorkflow(wf: Workflow): void {
  const payload = {
    name: wf.name,
    trigger_type: wf.trigger_type,
    trigger_config: wf.trigger_config ?? {},
    actions: (wf.actions ?? []).map((a) => ({
      step_order: a.step_order,
      action_type: a.action_type,
      action_config: a.action_config ?? {},
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${wf.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "workflow"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Simple daily run buckets for the analytics bar chart (last 7 days). */
export function dailyRunBuckets(runs: WorkflowRun[]): { day: string; total: number; failed: number }[] {
  const buckets: { day: string; total: number; failed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const dayRuns = runs.filter((r) => {
      if (!r.createdAt) return false;
      const rd = new Date(r.createdAt);
      return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth() && rd.getDate() === d.getDate();
    });
    buckets.push({ day: label, total: dayRuns.length, failed: dayRuns.filter(runIsFailed).length });
  }
  return buckets;
}
