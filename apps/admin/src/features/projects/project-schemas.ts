import { formatInr, formatShortDate } from "../clients/constants";

export type DeliveryPhase = {
  key: string;
  label: string;
  status: "done" | "in_progress" | "pending";
  progress?: number;
};

export type ProjectIntelligence = {
  project_health?: string;
  timeline_risk?: string;
  budget_risk?: string;
  current_bottleneck?: string;
  recommended_action?: string;
  predicted_completion?: string;
  ai_summary?: string;
  current_phase?: string;
  project_type?: string;
  confidence_percent?: number;
  delivery_phases?: DeliveryPhase[];
  risks?: string[];
};

export type ProjectRecord = {
  id: string;
  name?: string;
  client_id?: string;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_website?: string;
  status?: string;
  progress_pct?: number;
  budget_cents?: number | null;
  quoted_cents?: number | null;
  gst_cents?: number | null;
  collected_cents?: number;
  pending_cents?: number;
  expense_cents?: number;
  profit_cents?: number;
  start_date?: string | null;
  target_end_date?: string | null;
  project_type?: string | null;
  current_phase?: string | null;
  delivery_phases?: DeliveryPhase[] | null;
  ai_intelligence?: ProjectIntelligence | null;
  analyzed_at?: string | null;
  internal_notes?: string | null;
  live_url?: string | null;
  repository_url?: string | null;
  figma_url?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  color?: string | null;
  is_internal?: boolean;
  archived_at?: string | null;
  completed_at?: string | null;
  referred_by?: string | null;
  manager_email?: string | null;
  open_milestones?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectListStats = {
  total: number;
  active: number;
  completed: number;
  in_progress: number;
  archived: number;
  total_budget_cents: number;
  total_collected_cents: number;
  total_pending_cents: number;
};

export type HealthBreakdown = {
  timeline: number;
  budget: number;
  tasks: number;
  communication: number;
  payments: number;
  overall: number;
};

export type ManagerAction = {
  id: string;
  label: string;
  type: string;
  priority: "high" | "medium" | "low";
};

export type ManagerBrief = {
  greeting: string;
  summary_lines: string[];
  suggested_actions: ManagerAction[];
  estimated_completion: string;
  awaiting: string[];
  outstanding_cents: number;
  priorities: string[];
};

export type FeedEvent = {
  id: string;
  event_type: string;
  title: string;
  description?: string | null;
  actor?: string | null;
  created_at: string;
  icon?: string;
};

export type ProjectSummary = {
  budget_cents: number;
  collected_cents: number;
  pending_cents: number;
  collection_pct: number;
  expense_cents?: number;
  profit_cents?: number;
  health_score?: number;
  health_breakdown?: HealthBreakdown;
  manager_brief?: ManagerBrief;
  tasks_done?: number;
  tasks_total?: number;
  days_since_last_contact?: number | null;
  next_milestone: string | null;
  next_milestone_due_at: string | null;
  days_elapsed: number;
  total_days: number;
  days_until_end: number | null;
  manager_email: string | null;
  portal: {
    status: string;
    url: string | null;
    last_login_at: string | null;
    access_enabled: boolean;
  };
  intelligence: ProjectIntelligence;
  delivery_phases: DeliveryPhase[];
  invoice_count?: number;
  task_count?: number;
  open_milestones?: number;
};

export type ProjectFinance = {
  revenue_cents: number;
  expenses_cents: number;
  profit_cents: number;
  gst_cents: number;
  pending_cents: number;
  expected_cents: number;
  budget_cents: number;
  quoted_cents: number;
  margin_pct: number;
  collection_pct: number;
  cashflow: { month: string; inflow: number; outflow: number; net: number }[];
  payment_history: { id: string; invoice_number?: string; amount_cents: number; paid_at?: string }[];
  invoices: { id: string; invoice_number?: string; status?: string; total_cents: number; paid_at?: string }[];
};

export type ProjectAnalytics = {
  completion_pct: number;
  milestone_pct: number;
  tasks_total: number;
  tasks_done: number;
  burndown: { week: string; remaining: number; ideal: number }[];
  velocity: { week: string; completed: number }[];
  milestone_progress: { title?: string; pct: number; status: string }[];
  revenue_trend: { period: string; revenue: number }[];
  profit_trend: { period: string; profit: number }[];
  time_spent_hours: number;
  time_estimated_hours: number;
};

export type ProjectRevision = {
  id: string;
  revision_number: number;
  requested_by?: string;
  description?: string;
  status?: string;
  files_json?: unknown[];
  completed_by?: string;
  hours_spent?: number;
  approved?: boolean;
  approved_at?: string;
  createdAt?: string;
};

export type ProjectChangeOrder = {
  id: string;
  title?: string;
  description?: string;
  estimated_hours?: number;
  cost_cents?: number;
  status?: string;
  approval_status?: string;
  payment_status?: string;
  invoice_id?: string;
  createdAt?: string;
};

export type ProjectScopeItem = {
  id: string;
  category: string;
  title?: string;
  description?: string;
  cost_cents?: number;
  sort_order?: number;
};

export type ProjectResource = {
  id: string;
  user_id: string;
  email?: string;
  role?: string;
  allocation_pct?: number;
  estimated_hours?: number;
  actual_hours?: number;
  weekly_capacity_hours?: number;
  efficiency_pct?: number;
  open_tasks?: number;
};

export type ProjectDeploymentConfig = {
  id?: string;
  hosting?: string;
  server?: string;
  domain?: string;
  github_repo?: string;
  github_branch?: string;
  production_url?: string;
  staging_url?: string;
  ssl_status?: string;
  cron_jobs?: unknown[];
  database_info?: string;
  api_keys_json?: Record<string, string>;
  env_notes?: string;
  last_deployed_at?: string;
  last_deployed_by?: string;
};

export type ProjectDeploymentHistory = {
  id: string;
  environment?: string;
  version?: string;
  deployed_by?: string;
  status?: string;
  notes?: string;
  deployed_at?: string;
};

export type ProjectFolder = {
  id: string;
  name: string;
  folder_kind?: string;
  file_count?: number;
};

export type ProjectActivity = {
  id: string;
  event_type: string;
  title: string;
  description?: string | null;
  created_at: string;
};

export type ProjectMilestone = {
  id: string;
  title?: string;
  description?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  completion_pct?: number;
  status?: string;
};

export type ProjectTask = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  due_at?: string | null;
  assignee_user_id?: string | null;
};

export type ProjectFile = {
  id: string;
  name: string;
  mime_type?: string | null;
};

export type ProjectInvoice = {
  id: string;
  invoice_number?: string;
  status?: string;
  total_cents?: number;
  due_at?: string | null;
  paid_at?: string | null;
  project_id?: string;
};

export type ProjectMember = {
  user_id: string;
  email?: string;
  role?: string;
  curvvtech_role?: string;
};

export type ProjectNote = {
  id: string;
  body?: string;
  visibility?: string;
  note_type?: string;
  createdAt?: string;
};

export const NOTE_TYPES = ["internal", "client", "meeting", "ai"] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  internal: "Internal notes",
  client: "Client updates",
  meeting: "Meeting notes",
  ai: "AI notes",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const PROJECT_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function healthColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function healthBg(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function computeListHealth(project: ProjectRecord): number {
  const progress = Number(project.progress_pct ?? 0);
  const budget = Number(project.budget_cents ?? 0);
  const collected = Number(project.collected_cents ?? 0);
  const collectionPct = budget > 0 ? (collected / budget) * 100 : 100;
  let score = 50 + Math.min(25, progress * 0.25) + Math.min(10, collectionPct * 0.1);
  if (project.status === "completed") score = Math.max(score, 85);
  if (project.status === "cancelled") score = Math.min(score, 40);
  return Math.round(Math.max(0, Math.min(100, score)));
}

export const TEAM_ROLES = [
  { key: "project_manager", label: "Project Manager" },
  { key: "designer", label: "Designer" },
  { key: "developer", label: "Developer" },
  { key: "qa", label: "QA" },
] as const;

const DEFAULT_PHASES: DeliveryPhase[] = [
  { key: "requirements", label: "Requirements", status: "pending", progress: 0 },
  { key: "design", label: "Design", status: "pending", progress: 0 },
  { key: "development", label: "Development", status: "pending", progress: 0 },
  { key: "testing", label: "Testing", status: "pending", progress: 0 },
  { key: "launch", label: "Launch", status: "pending", progress: 0 },
];

export function buildFallbackManagerBrief(
  project: ProjectRecord,
  summary?: ProjectSummary | null,
  userName?: string,
): ManagerBrief {
  const firstName = userName?.split(/[@.\s]/)[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? `Good morning, ${firstName}` : hour < 17 ? `Good afternoon, ${firstName}` : `Good evening, ${firstName}`;

  const progress = Number(project.progress_pct ?? 0);
  const pending = summary?.pending_cents ?? project.pending_cents ?? 0;
  const statusLabel = PROJECT_STATUS_LABELS[project.status ?? "planning"] ?? project.status ?? "Planning";
  const intel = resolveIntel(project, summary);

  const summaryLines: string[] = [];
  if (intel.ai_summary) {
    summaryLines.push(intel.ai_summary.split("\n").filter(Boolean)[0] ?? intel.ai_summary);
  } else {
    summaryLines.push(`${project.name ?? "Project"} is ${statusLabel.toLowerCase()} at ${progress}% progress.`);
  }
  if (pending > 0) summaryLines.push(`${formatInr(pending)} outstanding on this project.`);
  if (summary?.next_milestone) summaryLines.push(`Next milestone: ${summary.next_milestone}.`);
  if (summary?.days_since_last_contact != null && summary.days_since_last_contact >= 3) {
    summaryLines.push(`No client contact for ${summary.days_since_last_contact} days.`);
  }

  const estimated =
    project.status === "completed"
      ? "Completed"
      : project.target_end_date
        ? formatShortDate(project.target_end_date)
        : intel.predicted_completion ?? "TBD";

  const actions: ManagerAction[] = [];
  if (pending > 0) actions.push({ id: "send-invoice", label: "Send invoice", type: "invoice", priority: "high" });
  if ((summary?.tasks_total ?? 0) > (summary?.tasks_done ?? 0)) {
    actions.push({
      id: "complete-tasks",
      label: `Complete ${(summary?.tasks_total ?? 0) - (summary?.tasks_done ?? 0)} open tasks`,
      type: "task",
      priority: "medium",
    });
  }
  if (progress >= 60) actions.push({ id: "deploy-staging", label: "Deploy staging", type: "deploy", priority: "medium" });
  if (actions.length === 0) actions.push({ id: "generate-plan", label: "Generate project plan", type: "plan", priority: "medium" });

  return {
    greeting,
    summary_lines: summaryLines.slice(0, 5),
    suggested_actions: actions.slice(0, 5),
    estimated_completion: estimated,
    awaiting: pending > 0 ? ["Invoice payment"] : [],
    outstanding_cents: pending,
    priorities: intel.recommended_action ? [intel.recommended_action] : [],
  };
}

export function buildFallbackProjectFinance(
  project: ProjectRecord,
  summary?: ProjectSummary | null,
  invoices: ProjectInvoice[] = [],
): ProjectFinance {
  const budgetCents = Number(summary?.budget_cents ?? project.budget_cents ?? 0);
  const collectedCents = Number(summary?.collected_cents ?? project.collected_cents ?? 0);
  const expenseCents = Number(summary?.expense_cents ?? project.expense_cents ?? 0);
  const gstCents = Number(project.gst_cents ?? 0);
  const quotedCents = Number(project.quoted_cents ?? budgetCents);
  const pendingCents = Number(summary?.pending_cents ?? project.pending_cents ?? Math.max(0, budgetCents - collectedCents));
  const profitCents = collectedCents - expenseCents;
  const collectionPct = budgetCents > 0 ? Math.round((collectedCents / budgetCents) * 100) : 0;
  const marginPct = collectedCents > 0 ? Math.round((profitCents / collectedCents) * 100) : 0;
  const paid = invoices.filter((i) => i.status === "paid");

  return {
    revenue_cents: collectedCents,
    expenses_cents: expenseCents,
    profit_cents: profitCents,
    gst_cents: gstCents,
    pending_cents: pendingCents,
    expected_cents: budgetCents + gstCents,
    budget_cents: budgetCents,
    quoted_cents: quotedCents,
    margin_pct: marginPct,
    collection_pct: collectionPct,
    cashflow: [],
    payment_history: paid.map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      amount_cents: Number(i.total_cents ?? 0),
      paid_at: i.paid_at,
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      status: i.status,
      total_cents: Number(i.total_cents ?? 0),
      paid_at: i.paid_at,
    })),
  };
}

export function buildFallbackProjectAnalytics(
  project: ProjectRecord,
  summary?: ProjectSummary | null,
  tasks: ProjectTask[] = [],
  milestones: ProjectMilestone[] = [],
): ProjectAnalytics {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done" || t.status === "completed").length;
  const completionPct = total > 0 ? Math.round((done / total) * 100) : Number(project.progress_pct ?? 0);
  const msDone = milestones.filter((m) => m.completed_at).length;
  const milestonePct = milestones.length > 0 ? Math.round((msDone / milestones.length) * 100) : completionPct;

  return {
    completion_pct: completionPct,
    milestone_pct: milestonePct,
    tasks_total: summary?.tasks_total ?? total,
    tasks_done: summary?.tasks_done ?? done,
    burndown: [],
    velocity: [],
    milestone_progress: milestones.map((m) => ({
      title: m.title,
      pct: m.completed_at ? 100 : 0,
      status: m.completed_at ? "completed" : "pending",
    })),
    revenue_trend: [],
    profit_trend: [],
    time_spent_hours: 0,
    time_estimated_hours: 0,
  };
}

export function buildPhasesFromProgress(progressPct: number): DeliveryPhase[] {
  const thresholds = [15, 35, 70, 90, 100];
  return DEFAULT_PHASES.map((phase, i) => {
    const prev = i === 0 ? 0 : thresholds[i - 1]!;
    const cap = thresholds[i]!;
    if (progressPct >= cap) return { ...phase, status: "done" as const, progress: 100 };
    if (progressPct >= prev) {
      const pct = cap > prev ? Math.round(((progressPct - prev) / (cap - prev)) * 100) : 0;
      return { ...phase, status: "in_progress" as const, progress: Math.max(5, pct) };
    }
    return { ...phase, status: "pending" as const, progress: 0 };
  });
}

/** Convert delivery roadmap phases into an overall completion percentage. */
export function phasesToProgress(phases: DeliveryPhase[] | null | undefined): number {
  if (!phases || phases.length === 0) return 0;
  const sum = phases.reduce((acc, p) => {
    if (p.status === "done") return acc + 100;
    if (p.status === "in_progress") return acc + Math.max(5, Number(p.progress ?? 50));
    return acc;
  }, 0);
  return Math.round(sum / phases.length);
}

/**
 * Effective progress for display: keeps the ring in sync with the delivery
 * roadmap and status instead of relying on the stale stored `progress_pct`.
 * A completed project is always 100%; otherwise use the stored value or the
 * roadmap-derived value, whichever is higher.
 */
export function deriveProgressPct(project: ProjectRecord, summary?: ProjectSummary | null): number {
  if (project.status === "completed") return 100;
  const stored = Number(project.progress_pct ?? 0);
  const storedPhases =
    Array.isArray(project.delivery_phases) && project.delivery_phases.length > 0
      ? project.delivery_phases
      : Array.isArray(summary?.delivery_phases) && summary!.delivery_phases.length > 0
        ? summary!.delivery_phases
        : null;
  if (!storedPhases) return stored;
  return Math.max(stored, phasesToProgress(storedPhases));
}

export function resolveIntel(project: ProjectRecord, summary?: ProjectSummary | null): ProjectIntelligence {
  const intel = project.ai_intelligence ?? summary?.intelligence;
  const progress = Number(project.progress_pct ?? 0);
  const phases =
    (Array.isArray(project.delivery_phases) && project.delivery_phases.length > 0
      ? project.delivery_phases
      : summary?.delivery_phases) ?? buildPhasesFromProgress(progress);
  const current = phases.find((p) => p.status === "in_progress") ?? phases.find((p) => p.status === "pending");
  const statusLabel = PROJECT_STATUS_LABELS[project.status ?? "planning"] ?? project.status ?? "planning";
  const client = project.client_name ?? "the client";
  const type = project.project_type ?? inferProjectType(project.name ?? "");
  const phaseName = current?.label?.toLowerCase() ?? "requirements";
  const timelineRisk = progress >= 30 ? "Low" : progress >= 10 ? "Medium" : "Low";

  const narrative = [
    `${client}'s ${type} project is currently in the ${statusLabel.toLowerCase()} phase.`,
    "",
    progress < 15
      ? "Requirements are being finalized before moving into design."
      : progress < 35
        ? "Design and content preparation are the focus before development begins."
        : progress < 70
          ? "Development is underway — keep milestones and client approvals on track."
          : progress < 90
            ? "Testing and QA should be prioritized before launch."
            : "Launch preparations are in progress — confirm go-live checklist.",
    "",
    timelineRisk === "Low" ? "No timeline risk detected yet." : "Monitor timeline — early phase projects need scope locked soon.",
    "",
    `Recommended next step:\n${current?.label === "Requirements" ? "Finalize homepage structure and content with the client." : current?.label === "Design" ? "Schedule a design review and collect client feedback." : current?.label === "Development" ? "Confirm sprint deliverables and blockers with the dev team." : "Schedule a client sync to confirm next milestone deliverables."}`,
  ].join("\n");

  const fallback: ProjectIntelligence = {
    project_health: progress >= 50 ? "Healthy" : progress >= 20 ? "Fair" : "Early stage",
    timeline_risk: timelineRisk,
    budget_risk: "Low",
    current_bottleneck: current?.label ? `${current.label} in progress` : "Requirements gathering",
    recommended_action:
      phaseName.includes("requirement")
        ? "Finalize homepage structure and content with the client."
        : "Schedule a client sync to confirm next milestone deliverables.",
    predicted_completion: project.target_end_date
      ? new Date(project.target_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : "TBD",
    ai_summary: narrative,
    project_type: type,
    delivery_phases: phases,
  };
  const merged = { ...fallback, ...intel, delivery_phases: intel?.delivery_phases ?? phases };
  if (!intel?.ai_summary || intel.ai_summary.includes("with 0% progress") || intel.ai_summary.includes("with 0 progress")) {
    merged.ai_summary = narrative;
  }
  return merged;
}

function inferProjectType(name: string): string {
  const text = name.toLowerCase();
  if (text.includes("shopify") || text.includes("ecommerce")) return "Shopify store";
  if (text.includes("mobile") || text.includes("app")) return "mobile app";
  if (text.includes("crm")) return "CRM platform";
  if (text.includes("admin")) return "admin panel";
  return "custom software";
}

export function groupFiles(files: ProjectFile[]): Record<string, ProjectFile[]> {
  const groups: Record<string, ProjectFile[]> = {
    "Brand Assets": [],
    "Design Files": [],
    Content: [],
    Contracts: [],
    Other: [],
  };
  for (const f of files) {
    const n = f.name.toLowerCase();
    if (/logo|font|brand/.test(n)) groups["Brand Assets"].push(f);
    else if (/\.(fig|sketch|psd|xd|ai)$/.test(n) || /design|mockup|wireframe/.test(n)) groups["Design Files"].push(f);
    else if (/\.(xlsx|csv|doc|docx|content|product)/.test(n)) groups.Content.push(f);
    else if (/\.pdf$/.test(n) || /proposal|invoice|contract|agreement/.test(n)) groups.Contracts.push(f);
    else groups.Other.push(f);
  }
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
}

export function formatDueIn(days: number | null | undefined): string {
  if (days == null) return "—";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export { formatInr, formatShortDate };
