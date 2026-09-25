import type { InboxConversation, InboxFilter } from "./inbox.types";
import { SOURCE_LABELS } from "./inbox.constants";

/** Real, human name if we know it — otherwise null (caller shows a friendly fallback). */
export function knownName(c: InboxConversation): string | null {
  const meta = c.metadata ?? {};
  return (
    c.participant?.name ||
    c.client_user_name ||
    c.lead_name ||
    c.lead?.name ||
    (meta.visitor_name as string | undefined) ||
    null
  );
}

export function shortVisitorId(visitorId?: string): string {
  if (!visitorId) return "unknown";
  if (visitorId.length <= 12) return visitorId;
  return `${visitorId.slice(0, 8)}…`;
}

export function conversationDisplayName(c: InboxConversation): string {
  const known = knownName(c) ?? c.client?.name ?? c.client?.company;
  if (known) return known;
  if (c.source === "portal") return "Client";
  return "Website Visitor";
}

/** The kind of participant — drives avatar, chips, and context-aware actions. */
export function participantType(c: InboxConversation): "client" | "lead" | "guest" {
  if (c.participant?.type) return c.participant.type;
  if (c.source === "portal" || c.client_id) return "client";
  if (c.lead_name || c.lead?.name || c.metadata?.lead_id) return "lead";
  return "guest";
}

/** The company/org to show under the participant's name. */
export function conversationCompany(c: InboxConversation): string | null {
  return c.participant?.company || c.client_company || c.lead?.business || c.summary?.business || null;
}

/** Secondary line under the name in the list/header (company · project, or contact). */
export function conversationSubtitle(c: InboxConversation): string {
  const company = conversationCompany(c);
  const project = c.project?.name || c.project_name;
  if (company && project) return `${company} · ${project}`;
  if (company) return company;
  if (project) return project;
  const email = c.participant?.email || c.lead_email || c.lead?.email;
  if (email) return email;
  const phone = c.participant?.phone || c.lead_phone || c.lead?.phone;
  if (phone) return phone;
  if (!knownName(c)) return `ID: ${shortVisitorId(c.visitor_id)}`;
  return sourceLabel(c.source);
}

/** Two-letter avatar initials from the participant name. */
export function participantInitials(c: InboxConversation): string {
  const name = conversationDisplayName(c).trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic avatar tint from a string. */
export function avatarTint(seed: string): string {
  const tints = [
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return tints[h % tints.length];
}

export function sourceLabel(source?: string): string {
  if (!source) return "Website";
  return SOURCE_LABELS[source] ?? source;
}

export function isAiActive(c: InboxConversation): boolean {
  return !c.agent_clerk_id && c.status !== "closed";
}

export function isWaitingForHuman(c: InboxConversation): boolean {
  return c.status === "escalated" && !c.agent_clerk_id;
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatMessageTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function statusBadge(c: InboxConversation): { label: string; className: string } {
  if (c.status === "closed") return { label: "Closed", className: "bg-slate-100 text-slate-600" };
  if (isWaitingForHuman(c)) return { label: "Waiting", className: "bg-red-100 text-red-700" };
  if (c.agent_clerk_id) return { label: "Human", className: "bg-blue-100 text-blue-700" };
  if (isAiActive(c)) return { label: "AI Active", className: "bg-amber-100 text-amber-700" };
  return { label: c.status, className: "bg-slate-100 text-slate-600" };
}

export type LiveStatus = { label: string; emoji: string; dot: string; text: string; chip: string };

/** Rich, human-readable conversation state for the header + list. */
export function liveStatus(c: InboxConversation): LiveStatus {
  if (c.status === "closed")
    return { label: "Closed", emoji: "✅", dot: "bg-slate-400", text: "text-slate-500", chip: "bg-slate-100 text-slate-600 border-slate-200" };
  if (isWaitingForHuman(c))
    return { label: "Waiting for human", emoji: "⏳", dot: "bg-red-500", text: "text-red-600", chip: "bg-red-50 text-red-700 border-red-200" };
  if (c.agent_clerk_id)
    return { label: "Human active", emoji: "🧑", dot: "bg-blue-500", text: "text-blue-600", chip: "bg-blue-50 text-blue-700 border-blue-200" };
  if (isAiActive(c))
    return { label: "AI responding", emoji: "🤖", dot: "bg-emerald-500", text: "text-emerald-600", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return { label: c.status, emoji: "•", dot: "bg-slate-400", text: "text-slate-500", chip: "bg-slate-100 text-slate-600 border-slate-200" };
}

export function matchesFilter(c: InboxConversation, filter: InboxFilter, myUserId?: string): boolean {
  const meta = c.metadata ?? {};
  switch (filter) {
    case "all":
      return c.status !== "closed" || filter === "all";
    case "unread":
      return (c.unread_count ?? 0) > 0;
    case "assigned":
      return meta.assignee_id === myUserId || c.agent_clerk_id === myUserId;
    case "waiting":
      return isWaitingForHuman(c);
    case "ai_active":
      return isAiActive(c);
    case "website":
      return c.source === "web" || c.source === "website" || !c.source;
    case "portal":
      return c.source === "portal";
    case "closed":
      return c.status === "closed";
    case "high":
      return meta.priority === "high" || meta.priority === "urgent";
    default:
      return true;
  }
}

export function filterCounts(
  conversations: InboxConversation[],
  myUserId?: string,
): Record<InboxFilter, number> {
  const counts = {
    all: 0,
    unread: 0,
    assigned: 0,
    waiting: 0,
    ai_active: 0,
    website: 0,
    portal: 0,
    closed: 0,
    high: 0,
  } as Record<InboxFilter, number>;
  const filters: InboxFilter[] = [
    "all",
    "unread",
    "assigned",
    "waiting",
    "ai_active",
    "website",
    "portal",
    "closed",
    "high",
  ];
  for (const c of conversations) {
    for (const f of filters) {
      if (matchesFilter(c, f, myUserId)) counts[f]++;
    }
  }
  return counts;
}

export function matchesSearch(c: InboxConversation, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.toLowerCase();
  const meta = c.metadata ?? {};
  const hay = [
    conversationDisplayName(c),
    conversationCompany(c),
    c.project?.name,
    c.project_name,
    c.lead_email,
    c.lead_phone,
    c.lead?.business,
    c.last_message,
    c.gist,
    c.visitor_id,
    meta.lead_id,
    meta.client_id,
    meta.project_id,
    ...(meta.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function senderLabel(sender: string, agentName?: string): string {
  if (sender === "user") return "Visitor";
  if (sender === "client") return "Client";
  if (sender === "ai") return "AI";
  if (sender === "agent") return agentName ?? "You";
  return sender;
}

export type LeadScore = { score: number; label: string; tone: "hot" | "warm" | "cold" };

/**
 * Heuristic 0-100 lead score from the signals we have: AI-detected interest,
 * whether we captured contact/budget/timeline, and message engagement.
 */
export function computeLeadScore(c: InboxConversation): LeadScore {
  let score = 30;
  const s = c.summary;
  const lead = c.lead;
  const interest = (s?.interest_level ?? "").toLowerCase();
  if (interest.includes("high")) score += 35;
  else if (interest.includes("medium")) score += 18;
  else if (interest.includes("low")) score += 4;

  if (c.lead_email || lead?.email) score += 12;
  if (c.lead_phone || lead?.phone) score += 10;
  if (lead?.budget || s?.budget) score += 8;
  if (lead?.timeline || s?.timeline) score += 5;
  if (lead?.business || s?.business) score += 4;

  const msgs = c.message_count ?? c.messages?.length ?? 0;
  if (msgs >= 8) score += 8;
  else if (msgs >= 4) score += 4;

  score = Math.max(0, Math.min(100, score));
  const tone: LeadScore["tone"] = score >= 70 ? "hot" : score >= 45 ? "warm" : "cold";
  const label = tone === "hot" ? "High Intent" : tone === "warm" ? "Warm" : "Cold";
  return { score, label, tone };
}

export type Sentiment = { emoji: string; label: string };

export function sentimentFromInterest(interest?: string): Sentiment {
  const i = (interest ?? "").toLowerCase();
  if (i.includes("high")) return { emoji: "😄", label: "Positive" };
  if (i.includes("medium")) return { emoji: "🙂", label: "Neutral" };
  if (i.includes("low")) return { emoji: "😐", label: "Low" };
  return { emoji: "🙂", label: "Neutral" };
}

export type MessageGroup = {
  sender: string;
  time?: string;
  messages: { id: string; message: string }[];
};

/** Group consecutive messages from the same sender into visual clusters. */
export function groupMessages(
  messages: { id: string; sender: string; message: string; createdAt?: string }[],
): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last.sender === m.sender) {
      last.messages.push({ id: m.id, message: m.message });
    } else {
      groups.push({ sender: m.sender, time: m.createdAt, messages: [{ id: m.id, message: m.message }] });
    }
  }
  return groups;
}
