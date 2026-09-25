import { Link } from "react-router-dom";
import { useState } from "react";
import {
  CalendarClock,
  FileSignature,
  FolderKanban,
  FolderOpen,
  GitBranch,
  Globe,
  ListChecks,
  Loader2,
  MapPin,
  Receipt,
  Sparkles,
  Tag,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CONVERSATION_TAGS } from "../inbox.constants";
import type { InboxConversation, TeamMember } from "../inbox.types";
import {
  avatarTint,
  computeLeadScore,
  conversationCompany,
  conversationDisplayName,
  liveStatus,
  participantInitials,
  participantType,
  relativeTime,
  sentimentFromInterest,
  sourceLabel,
} from "../inbox.utils";

const HEALTH_META: Record<string, { label: string; className: string }> = {
  on_track: { label: "🟢 On Track", className: "text-emerald-600" },
  watch: { label: "🟡 Watch", className: "text-amber-600" },
  at_risk: { label: "🔴 At Risk", className: "text-red-600" },
  done: { label: "✅ Delivered", className: "text-blue-600" },
};

function money(cents?: number | null): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    (cents ?? 0) / 100,
  );
}

function formatEventTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type TimelineEvent = { label: string; time?: string; dot: string };

/** Derive a lifecycle timeline from the conversation's messages + metadata. */
function buildTimeline(conversation: InboxConversation): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const msgs = conversation.messages ?? [];
  const started = conversation.started_at ?? conversation.createdAt;
  if (started) events.push({ label: "Conversation started", time: started, dot: "bg-slate-400" });
  const firstAi = msgs.find((m) => m.sender === "ai");
  if (firstAi) events.push({ label: "🤖 AI joined", time: firstAi.createdAt, dot: "bg-emerald-500" });
  const firstAgent = msgs.find((m) => m.sender === "agent");
  if (firstAgent) events.push({ label: "🧑 Human takeover", time: firstAgent.createdAt, dot: "bg-blue-500" });
  const meta = conversation.metadata ?? {};
  if (meta.lead_id) events.push({ label: "Converted to lead", dot: "bg-violet-500" });
  if (conversation.ended_at) events.push({ label: "✅ Closed", time: conversation.ended_at, dot: "bg-slate-400" });
  return events;
}

type Props = {
  conversation: InboxConversation | null;
  team: TeamMember[];
  summarizing?: boolean;
  converting?: boolean;
  onUpdate: (patch: Record<string, unknown>) => void;
  onSummarize: () => void;
  onConvertLead: () => void;
  onCreateTask: () => void;
  onCreateProposal: () => void;
};

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2 text-xs">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  );
}

export function CustomerProfilePanel({
  conversation,
  team,
  summarizing,
  converting,
  onUpdate,
  onSummarize,
  onConvertLead,
  onCreateTask,
  onCreateProposal,
}: Props) {
  const [noteText, setNoteText] = useState("");
  const [tagInput, setTagInput] = useState("");

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center border-l border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Customer profile
      </div>
    );
  }

  const meta = conversation.metadata ?? {};
  const lead = conversation.lead;
  const summary = conversation.summary;
  const notes = meta.notes ?? [];
  const tags = meta.tags ?? [];
  const leadId = meta.lead_id as string | undefined;
  const client = conversation.client;
  const participant = conversation.participant;
  const project = conversation.project;
  const ptype = participantType(conversation);
  const isClient = ptype === "client";
  const email = participant?.email || conversation.lead_email || lead?.email || client?.email;
  const phone = participant?.phone || conversation.lead_phone || lead?.phone || client?.phone;
  const company = conversationCompany(conversation);
  const name = conversationDisplayName(conversation);
  const status = liveStatus(conversation);
  const owner = meta.assignee_name as string | undefined;
  const pages = conversation.pages_visited ?? [];
  const score = computeLeadScore(conversation);
  const sentiment = sentimentFromInterest(summary?.interest_level);
  const gist = summary?.gist || conversation.gist;
  const lastQuestion = [...(conversation.messages ?? [])]
    .reverse()
    .find((m) => m.sender === "user" || m.sender === "client")?.message;
  const recommended = isClient
    ? "Provide a status update"
    : score.tone === "hot"
      ? "Assign to Sales"
      : leadId
        ? "Follow up this week"
        : "Qualify further";

  const timeline = buildTimeline(conversation);

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    onUpdate({ tags: [...tags, t] });
    setTagInput("");
  }

  function removeTag(tag: string) {
    onUpdate({ tags: tags.filter((x) => x !== tag) });
  }

  function saveNote() {
    if (!noteText.trim()) return;
    onUpdate({ notes: noteText.trim() });
    setNoteText("");
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l border-border bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              avatarTint(name),
            )}
          >
            {participantInitials(conversation)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{name}</h3>
            {(participant?.role || company) && (
              <p className="truncate text-[11px] text-muted-foreground">
                {[participant?.role, company].filter(Boolean).join(" • ")}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[10px] font-medium", status.chip)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                {status.label}
              </span>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Globe className="h-2.5 w-2.5" />
                {conversation.source === "portal" ? "Client Portal" : sourceLabel(conversation.source)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Identity */}
        <dl className="space-y-1.5">
          {isClient ? (
            <>
              <Row label="Company" value={company} />
              <Row label="Project" value={project?.name || conversation.project_name} />
              <Row label="Client since" value={participant?.since ? relativeTime(participant.since) : undefined} />
            </>
          ) : (
            <Row label="Source" value={sourceLabel(conversation.source)} />
          )}
          <Row label="Started" value={relativeTime(conversation.started_at ?? conversation.createdAt)} />
          <Row label="Last active" value={relativeTime(conversation.last_message_at ?? conversation.updatedAt)} />
          {owner && <Row label="Owner" value={owner} />}
        </dl>

        {/* Project context (portal) */}
        {project && (
          <section className="space-y-2 rounded-xl border border-border bg-gradient-to-br from-emerald-50/60 to-transparent p-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1 text-xs font-semibold">
                <FolderKanban className="h-3.5 w-3.5 text-emerald-600" /> Current project
              </h4>
              <span className={cn("text-[11px] font-medium", HEALTH_META[project.health]?.className)}>
                {HEALTH_META[project.health]?.label ?? project.health}
              </span>
            </div>
            <p className="truncate text-sm font-semibold">{project.name}</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, project.progress_pct)}%` }} />
              </div>
              <span className="text-[11px] font-semibold tabular-nums">{project.progress_pct}%</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
              <Row label="Phase" value={project.current_phase} />
              <Row label="Due" value={project.target_end_date ? new Date(project.target_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : undefined} />
              <Row label="Open tasks" value={project.open_tasks ? String(project.open_tasks) : "0"} />
              <Row label="Approvals" value={project.pending_approvals ? String(project.pending_approvals) : "0"} />
              <Row label="Outstanding" value={project.outstanding_cents ? money(project.outstanding_cents) : "—"} />
            </dl>
          </section>
        )}

        <div className="h-px bg-border" />

        {/* Ownership */}
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Owner</Label>
            <Select
              value={meta.assignee_id ?? "unassigned"}
              onValueChange={(v) => {
                if (v === "unassigned") {
                  onUpdate({ assignee_id: null, assignee_name: null });
                } else {
                  const member = team.find((m) => m.user_id === v);
                  onUpdate({
                    assignee_id: v,
                    assignee_name: member?.name || member?.email || "Agent",
                    agent_takeover: true,
                  });
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {team.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.name || m.email || m.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select
                value={meta.priority ?? "normal"}
                onValueChange={(v) => onUpdate({ priority: v === "normal" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={conversation.status} onValueChange={(v) => onUpdate({ status: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Client (portal) */}
        {client && (
          <>
            <div className="h-px bg-border" />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">Client</span>
                <Link to={`/clients/${client.id}`} className="text-[10px] font-medium text-primary hover:underline">
                  View profile
                </Link>
              </div>
              <dl className="space-y-1.5">
                <Row label="Name" value={client.name} />
                <Row label="Company" value={client.company} />
                <Row label="Website" value={client.website} />
                <Row label="GST" value={client.gst_number} />
                <Row label="Status" value={client.status} />
              </dl>
            </div>
          </>
        )}

        {/* Contact */}
        {(email || phone || company || conversation.country) && (
          <>
            <div className="h-px bg-border" />
            <dl className="space-y-1.5">
              <Row label="Email" value={email} />
              <Row label="Phone" value={phone} />
              {!client && <Row label="Company" value={company} />}
              <Row label="Location" value={conversation.country} />
              <Row label="Budget" value={lead?.budget || summary?.budget} />
              <Row label="Timeline" value={lead?.timeline || summary?.timeline} />
            </dl>
          </>
        )}

        <div className="h-px bg-border" />

        {/* Tags */}
        <section className="space-y-2">
          <h4 className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
            <Tag className="h-3 w-3" /> Tags
          </h4>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => removeTag(t)}
                  className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] hover:bg-red-50"
                >
                  {t} ×
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {CONVERSATION_TAGS.filter((t) => !tags.includes(t)).map((t) => (
              <button
                key={t}
                onClick={() => addTag(t)}
                className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary"
              >
                + {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              placeholder="Custom tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === "Enter" && addTag(tagInput)}
            />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addTag(tagInput)}>
              Add
            </Button>
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* AI Summary card */}
        <section className="space-y-2 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Summary
            </h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 text-[10px]"
              onClick={onSummarize}
              disabled={summarizing}
            >
              {summarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
            </Button>
          </div>
          {gist ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{gist}</p>
          ) : (
            <p className="text-xs text-muted-foreground">No summary yet — click Refresh to generate.</p>
          )}
          <dl className="space-y-1 pt-1">
            {isClient ? (
              <>
                <Row label="Intent" value={summary?.lead_type || "Status update"} />
                <Row label="Sentiment" value={`${sentiment.emoji} ${sentiment.label}`} />
                <Row label="Project" value={project?.name || conversation.project_name} />
                <Row label="Last question" value={lastQuestion} />
              </>
            ) : (
              <>
                <Row label="Needs" value={summary?.lead_type} />
                <Row label="Budget" value={summary?.budget || lead?.budget || "Unknown"} />
                <Row label="Timeline" value={summary?.timeline || lead?.timeline || "Unknown"} />
                <Row label="Industry" value={summary?.business || lead?.business || "Unknown"} />
                <Row label="Sentiment" value={`${sentiment.emoji} ${sentiment.label}`} />
                <Row label="Lead score" value={`${score.score}/100`} />
              </>
            )}
          </dl>
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1.5 text-xs">
            <span className="text-muted-foreground">Recommended:</span>
            <span className="font-medium text-primary">{recommended}</span>
          </div>
        </section>

        {/* Visitor intelligence */}
        {(pages.length > 0 || conversation.country || conversation.ip_address) && (
          <section className="space-y-2">
            <h4 className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <MapPin className="h-3 w-3" /> Visitor details
            </h4>
            <dl className="space-y-1.5">
              <Row label="Location" value={conversation.country} />
              <Row label="IP" value={conversation.ip_address} />
              <Row label="Pages viewed" value={pages.length ? String(pages.length) : undefined} />
            </dl>
            {pages.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {pages.slice(0, 6).map((p, i) => (
                  <Badge key={`${p}-${i}`} variant="outline" className="max-w-full truncate text-[9px]">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="h-px bg-border" />

        {/* Conversation timeline */}
        {timeline.length > 0 && (
          <>
            <section className="space-y-2">
              <h4 className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> Conversation timeline
              </h4>
              <ol className="relative space-y-3 border-l border-border pl-4">
                {timeline.map((ev, i) => (
                  <li key={i} className="relative">
                    <span className={cn("absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card", ev.dot)} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{ev.label}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{formatEventTime(ev.time)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <div className="h-px bg-border" />
          </>
        )}

        {/* Notes */}
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Internal notes</h4>
          <Textarea
            placeholder="Add a note (internal only)…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-full text-xs"
            onClick={saveNote}
            disabled={!noteText.trim()}
          >
            Save note
          </Button>
          {notes.length > 0 && (
            <ul className="max-h-32 space-y-2 overflow-y-auto">
              {[...notes].reverse().map((n) => (
                <li key={n.id} className="rounded border border-border bg-amber-50/50 p-2 text-[11px]">
                  <div className="text-[10px] text-muted-foreground">
                    {n.author_name ?? "Agent"} · {relativeTime(n.at)}
                  </div>
                  {n.text}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Actions */}
        <section className="space-y-2 border-t border-border pt-4">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Quick actions</h4>
          <div className="grid grid-cols-1 gap-1.5">
            {isClient ? (
              <>
                {project && (
                  <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" asChild>
                    <Link to={`/projects/${project.id}`}>
                      <FolderOpen className="h-3.5 w-3.5" /> Open project
                    </Link>
                  </Button>
                )}
                {project && (
                  <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" asChild>
                    <Link to={`/projects/${project.id}?tab=revisions`}>
                      <GitBranch className="h-3.5 w-3.5" /> Create revision
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" onClick={onCreateTask}>
                  <CalendarClock className="h-3.5 w-3.5" /> Schedule meeting
                </Button>
                {client && (
                  <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" asChild>
                    <Link to={`/invoices/new?client=${client.id}`}>
                      <Receipt className="h-3.5 w-3.5" /> Generate invoice
                    </Link>
                  </Button>
                )}
                {client && (
                  <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" asChild>
                    <Link to={`/clients/${client.id}`}>
                      <FolderKanban className="h-3.5 w-3.5" /> View client
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 justify-start gap-2 text-xs"
                  onClick={onConvertLead}
                  disabled={converting || Boolean(leadId)}
                >
                  {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {leadId ? "Lead linked" : "Convert to lead"}
                </Button>
                <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" onClick={onCreateProposal}>
                  <FileSignature className="h-3.5 w-3.5" /> Generate proposal
                </Button>
                <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" onClick={onCreateTask}>
                  <ListChecks className="h-3.5 w-3.5" /> Create follow-up task
                </Button>
                {leadId && (
                  <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" asChild>
                    <Link to={`/leads/${leadId}`}>
                      <FolderKanban className="h-3.5 w-3.5" /> View lead
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
