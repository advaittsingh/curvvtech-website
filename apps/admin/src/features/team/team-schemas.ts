import { formatInr, formatShortDate } from "../clients/constants";

export const ROLE_META: Record<string, { label: string; badge: string }> = {
  super_admin: { label: "Founder", badge: "bg-violet-100 text-violet-800 border-violet-200" },
  admin: { label: "Admin", badge: "bg-slate-100 text-slate-800 border-slate-200" },
  manager: { label: "Manager", badge: "bg-blue-100 text-blue-800 border-blue-200" },
  project_manager: { label: "Project Manager", badge: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  developer: { label: "Developer", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  designer: { label: "Designer", badge: "bg-pink-100 text-pink-800 border-pink-200" },
  sales: { label: "Sales", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  accountant: { label: "Accountant", badge: "bg-teal-100 text-teal-800 border-teal-200" },
  member: { label: "Member", badge: "bg-stone-100 text-stone-700 border-stone-200" },
};

export const TEAM_ROLES = Object.keys(ROLE_META);

export type TeamMember = {
  user_id: string;
  email?: string | null;
  name: string;
  phone?: string | null;
  role?: string | null;
  role_title?: string | null;
  department: string;
  project_count: number;
  active_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  utilization_pct: number;
  workload: string;
  status: string;
  monthly_salary_cents?: number | null;
  joined_at?: string | null;
};

export type TeamSummary = {
  member_count: number;
  department_count: number;
  open_tasks: number;
  capacity_used_pct: number;
};

export type TeamDepartment = {
  department: string;
  member_count: number;
  open_tasks: number;
};

export type TeamWorkload = {
  user_id: string;
  name: string;
  utilization_pct: number;
  active_tasks: number;
  workload: string;
};

export type TeamActivityItem = {
  id: string;
  message: string;
  actor_name?: string | null;
  created_at?: string | null;
};

export type OpenPosition = {
  id: string;
  title: string;
  department?: string | null;
  status: string;
};

export type TeamAiInsight = {
  insight: string;
  most_productive_name: string | null;
  overloaded_name: string | null;
  idle_name: string | null;
  recommended_action: string;
};

export type TeamDashboard = {
  summary: TeamSummary;
  members: TeamMember[];
  departments: TeamDepartment[];
  workload: TeamWorkload[];
  activity: TeamActivityItem[];
  open_positions: OpenPosition[];
  ai_insight: TeamAiInsight;
};

export type TeamMemberDetail = TeamMember & {
  projects: { id: string; name: string; status?: string }[];
  tasks: { id: string; title: string; status: string; due_at?: string | null; project_name?: string | null }[];
  activity: TeamActivityItem[];
};

export function roleLabel(role?: string | null): string {
  if (!role) return "—";
  return ROLE_META[role]?.label ?? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function departmentLabel(dept?: string | null): string {
  if (!dept) return "General";
  return dept.charAt(0).toUpperCase() + dept.slice(1);
}

export function workloadColor(workload: string): string {
  switch (workload) {
    case "Overloaded":
      return "text-red-600";
    case "High":
      return "text-amber-700";
    case "Medium":
      return "text-blue-700";
    case "Light":
      return "text-emerald-700";
    default:
      return "text-muted-foreground";
  }
}

export { formatInr, formatShortDate };
