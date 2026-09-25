export type CareerApplicationStatus = "new" | "shortlisted" | "rejected";

export type CareerRoleSummary = {
  slug: string;
  title: string;
  team: string;
  new_count: number;
  shortlisted_count: number;
  rejected_count: number;
  total_count: number;
  latest_at: string | null;
};

export type CareerApplication = {
  id: string;
  role_slug: string;
  role_title: string;
  team: string | null;
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  message: string | null;
  resume_filename: string;
  resume_content_type: string;
  resume_size_bytes: number | null;
  status: CareerApplicationStatus;
  rejected_at: string | null;
  shortlisted_at: string | null;
  interview_at: string | null;
  interview_duration_min: number | null;
  interview_meet_url: string | null;
  interview_note: string | null;
  interview_email_sent_at: string | null;
  rejection_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CareerPile = "new" | "shortlisted" | "rejected";

export function pileFromSearch(value: string | null): CareerPile {
  if (value === "shortlisted" || value === "rejected") return value;
  return "new";
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAppliedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatInterviewIst(iso: string | null | undefined, durationMin?: number | null): string {
  if (!iso) return "—";
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return "—";
  const startLabel = start.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (!durationMin) return `${startLabel} IST`;
  const end = new Date(start.getTime() + durationMin * 60_000);
  const endLabel = end.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${startLabel} – ${endLabel} IST`;
}

/** Next weekday 11:00 as datetime-local. The API treats the typed value as IST. */
export function defaultInterviewDatetimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
