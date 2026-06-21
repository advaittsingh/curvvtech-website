import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  parseISO,
  startOfWeek,
  addDays,
  isWithinInterval,
} from "date-fns";

export type TaskRecord = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string;
  due_at?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  assignee_user_id?: string | null;
  assignee_email?: string | null;
  assignee_name?: string | null;
  updatedAt?: string;
};

export type TaskSummary = {
  total: number;
  due_today: number;
  in_review: number;
  overdue: number;
  due_this_week: number;
  completed: number;
  completion_rate: number;
};

export type TaskActivityEvent = {
  id: string;
  action: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
  actor_name?: string | null;
  actor_email?: string | null;
  task_title?: string | null;
  project_name?: string | null;
};

export const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["critical", "high", "medium", "low"] as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  review: "bg-violet-50 text-violet-700 border-violet-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const TASK_PRIORITY_META: Record<
  string,
  { label: string; dot: string; badge: string; emoji: string }
> = {
  critical: {
    label: "Critical",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    emoji: "🔴",
  },
  high: {
    label: "High",
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    emoji: "🟠",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    emoji: "🟡",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    emoji: "🟢",
  },
};

export function priorityMeta(priority?: string | null) {
  const key = (priority ?? "medium").toLowerCase();
  return TASK_PRIORITY_META[key] ?? TASK_PRIORITY_META.medium;
}

export function assigneeInitials(name?: string | null, email?: string | null): string {
  const source = name ?? email ?? "?";
  const parts = source.split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function assigneeLabel(name?: string | null, email?: string | null): string {
  if (name) return name.split("@")[0] ?? name;
  if (email) return email.split("@")[0] ?? email;
  return "Unassigned";
}

export type DueMeta = {
  label: string;
  tone: "overdue" | "today" | "tomorrow" | "soon" | "normal" | "none";
  className: string;
};

export function formatTaskDue(dueAt?: string | null, status?: string): DueMeta {
  if (!dueAt || status === "done") {
    return { label: "No due date", tone: "none", className: "text-muted-foreground" };
  }
  const date = parseISO(dueAt);
  const days = differenceInCalendarDays(date, new Date());
  if (days < 0) {
    const n = Math.abs(days);
    return {
      label: n === 1 ? "Overdue by 1 day" : `Overdue by ${n} days`,
      tone: "overdue",
      className: "text-red-600 font-medium",
    };
  }
  if (isToday(date)) {
    return { label: "Due today", tone: "today", className: "text-orange-600 font-medium" };
  }
  if (isTomorrow(date)) {
    return { label: "Due tomorrow", tone: "tomorrow", className: "text-amber-700 font-medium" };
  }
  if (days <= 7) {
    return { label: `Due ${format(date, "MMM d")}`, tone: "soon", className: "text-foreground" };
  }
  return { label: format(date, "MMM d"), tone: "normal", className: "text-muted-foreground" };
}

export function isDueThisWeek(dueAt?: string | null, status?: string): boolean {
  if (!dueAt || status === "done") return false;
  const date = parseISO(dueAt);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  return isWithinInterval(date, { start: weekStart, end: weekEnd });
}

export function columnCompletionPct(status: TaskStatus, tasks: TaskRecord[]): string {
  if (status === "done") return "100% done";
  const open = tasks.filter((t) => t.status !== "done").length;
  const total = tasks.length;
  if (total === 0) return "Empty";
  if (status === "todo") return `${open} open total`;
  const inCol = tasks.filter((t) => t.status === status).length;
  return total > 0 ? `${Math.round((inCol / total) * 100)}% of open` : "Empty";
}

export function describeActivity(event: TaskActivityEvent): string {
  const title = event.task_title ?? (event.details?.title as string | undefined) ?? "Task";
  const project = event.project_name ? ` · ${event.project_name}` : "";
  const actor = event.actor_name ?? event.actor_email ?? "Someone";
  const from = event.details?.from as string | undefined;
  const to = event.details?.to as string | undefined;

  switch (event.action) {
    case "task_created":
      return `${actor} created "${title}"${project}`;
    case "task_completed":
      return `${actor} completed "${title}"${project}`;
    case "task_status_changed":
      return `${actor} moved "${title}" to ${TASK_STATUS_LABELS[to ?? ""] ?? to ?? "updated"}${project}`;
    case "plan_generated":
      return `AI generated a plan${project}`;
    default:
      return `${actor} updated "${title}"${project}`;
  }
}

export type TaskFilters = {
  projectId: string | null;
  assigneeId: string | null;
  priority: string | null;
  status: string | null;
};

export function filterTasks(tasks: TaskRecord[], filters: TaskFilters): TaskRecord[] {
  return tasks.filter((t) => {
    if (filters.projectId && t.project_id !== filters.projectId) return false;
    if (filters.assigneeId && t.assignee_user_id !== filters.assigneeId) return false;
    if (filters.priority && (t.priority ?? "medium") !== filters.priority) return false;
    if (filters.status && t.status !== filters.status) return false;
    return true;
  });
}
