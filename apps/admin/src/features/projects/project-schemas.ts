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
  client_email?: string;
  status?: string;
  progress_pct?: number;
  budget_cents?: number | null;
  start_date?: string | null;
  target_end_date?: string | null;
  project_type?: string | null;
  current_phase?: string | null;
  delivery_phases?: DeliveryPhase[] | null;
  ai_intelligence?: ProjectIntelligence | null;
  analyzed_at?: string | null;
  internal_notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectSummary = {
  budget_cents: number;
  collected_cents: number;
  pending_cents: number;
  collection_pct: number;
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
  due_at?: string | null;
  completed_at?: string | null;
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
};

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
