"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  CalendarDays,
  FolderOpen,
  Receipt,
  GitPullRequestArrow,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  X,
  ArrowLeft,
  Check,
  Ban,
  Sparkles,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { TaskProgressSummary } from "@/components/project/TaskProgressSummary";
import { ProjectFilesPanel } from "@/components/project/ProjectFilesPanel";
import {
  Card,
  SectionCard,
  Progress,
  Ring,
  Badge,
  HealthPill,
  Empty,
  Btn,
  Avatar,
  TimelineItem,
  QuickAction,
  Skeleton,
  deriveHealth,
  relativeTime,
  formatDate,
  cn,
} from "@/components/ui";

type Project = {
  id: string; name: string; status: string; progress_pct: number;
  current_phase: string | null; start_date: string | null; target_end_date: string | null;
  completed_at: string | null; live_url: string | null; updated_at: string;
};
type Milestone = { id: string; title: string; description: string | null; status: string; due_at: string | null; completed_at: string | null; completion_pct: number };
type Task = { id: string; title: string; description: string | null; status: string; due_at: string | null; client_actionable?: boolean };
type TaskProgress = { project_id: string; total: number; done: number; remaining: number; client_visible_total: number; client_visible_open: number };
type ScopeItem = { id: string; category: string; title: string; description: string | null };
type Timeline = { id: string; title: string; body?: string | null; created_at: string; event_type: string };
type TeamMember = { id: string; email: string; role: string };
type Revision = { id: string; revision_number: number; description: string; status: string; created_at: string };

const TABS = ["Overview", "Timeline", "Milestones", "Tasks", "Scope", "Files", "Changes"] as const;
type Tab = (typeof TABS)[number];

function nameFromEmail(e: string) {
  return e.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const { setSelectedProjectId } = useWorkspace();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "Overview";
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab) ? initialTab : "Overview");
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null);
  const [scope, setScope] = useState<ScopeItem[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [changeOpen, setChangeOpen] = useState(false);

  function loadRevisions() {
    api<{ revisions: Revision[] }>(`/projects/${id}/revisions`).then((r) => setRevisions(r.revisions)).catch(() => {});
  }

  const loadTasks = useCallback(() => {
    api<{ tasks: Task[]; progress: TaskProgress }>(`/projects/${id}/tasks`)
      .then((r) => {
        setTasks(r.tasks);
        setTaskProgress(r.progress);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    setSelectedProjectId(id);
    api<{ project: Project }>(`/projects/${id}`).then((r) => setProject(r.project)).catch(() => {});
    api<{ milestones: Milestone[] }>(`/projects/${id}/milestones`).then((r) => setMilestones(r.milestones)).catch(() => {});
    loadTasks();
    api<{ scope: ScopeItem[] }>(`/projects/${id}/scope`).then((r) => setScope(r.scope)).catch(() => {});
    api<{ timeline: Timeline[] }>(`/projects/${id}/timeline`).then((r) => setTimeline(r.timeline)).catch(() => {});
    api<{ team: TeamMember[] }>(`/projects/${id}/team`).then((r) => setTeam(r.team)).catch(() => {});
    loadRevisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadTasks, setSelectedProjectId]);

  useEffect(() => {
    const poll = setInterval(loadTasks, 30_000);
    return () => clearInterval(poll);
  }, [loadTasks]);

  async function completeTask(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "done" } : t)));
    await api(`/tasks/${taskId}`, { method: "PATCH" }).catch(() => {});
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const health = deriveHealth(project);
  const pm = team.find((m) => /manager|lead|pm/i.test(m.role)) ?? team[0];
  const nextMilestone = milestones.find((m) => m.status !== "completed" && m.status !== "done");
  const openTasks = tasks.filter((t) => t.status !== "done");
  const actionableTasks = tasks.filter((t) => t.client_actionable);
  const openActionable = actionableTasks.filter((t) => t.status !== "done");

  return (
    <div className="cp-animate">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] mb-4">
        <ArrowLeft size={15} /> All projects
      </Link>

      {/* Hero */}
      <Card className="p-0 overflow-hidden mb-5">
        <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          <Ring value={project.progress_pct} size={88} stroke={8}>
            <div className="text-center">
              <div className="text-lg font-bold leading-none">{project.progress_pct}%</div>
            </div>
          </Ring>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold truncate">{project.name}</h1>
              <HealthPill level={health} />
              <Badge status={project.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <HeroStat label="Stage" value={project.current_phase ?? "In progress"} />
              <HeroStat label="Delivery" value={project.target_end_date ? formatDate(project.target_end_date) : "TBD"} />
              <HeroStat label="Started" value={project.start_date ? formatDate(project.start_date) : "—"} />
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Project manager</div>
                {pm ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar name={nameFromEmail(pm.email)} size={22} />
                    <span className="font-semibold text-sm truncate">{nameFromEmail(pm.email)}</span>
                  </div>
                ) : (
                  <div className="font-semibold mt-0.5">—</div>
                )}
              </div>
            </div>
            <Progress value={project.progress_pct} className="mt-5" />
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <QuickAction icon={FolderOpen} label="Documents" meta="Project files" tone="brand" onClick={() => setTab("Files")} />
        <QuickAction icon={Receipt} label="Invoices" meta="View & pay" tone="orange" href="/billing" />
        <QuickAction icon={MessageSquare} label="Support" meta="Message your team" tone="purple" href="/inbox" />
        <QuickAction icon={CalendarDays} label="Meetings" meta="Schedule a call" tone="info" href="/meetings" />
        <QuickAction icon={GitPullRequestArrow} label="Request change" meta="Open a request" tone="warn" onClick={() => setChangeOpen(true)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition",
              tab === t ? "border-[var(--brand)] text-[var(--text)]" : "border-transparent text-[var(--muted)] hover:text-[var(--text)]",
            )}
          >
            {t}
            {t === "Tasks" && openActionable.length > 0 && (
              <span className="ml-1.5 text-[10px] font-semibold rounded-full bg-[var(--brand)] text-white px-1.5 py-0.5">{openActionable.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "Overview" && (
        <div className="grid lg:grid-cols-3 gap-5 cp-animate-in">
          <SectionCard title="Task progress" className="lg:col-span-3">
            <TaskProgressSummary progress={taskProgress} projectId={id} />
          </SectionCard>
          <SectionCard title="Project snapshot" className="lg:col-span-2">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <SnapRow label="Current phase" value={project.current_phase ?? "In progress"} />
              <SnapRow label="Health" value={<HealthPill level={health} />} />
              <SnapRow label="Started" value={project.start_date ? formatDate(project.start_date) : "—"} />
              <SnapRow label="Estimated completion" value={project.target_end_date ? formatDate(project.target_end_date) : "TBD"} />
              <SnapRow label="Last update" value={relativeTime(project.updated_at)} />
              <SnapRow label="Progress" value={`${project.progress_pct}%`} />
            </div>
            {project.live_url && (
              <div className="mt-5 pt-4 border-t border-[var(--border)]">
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Live URL</div>
                <a href={project.live_url} target="_blank" rel="noreferrer" className="font-medium text-[var(--brand-accent)]">
                  {project.live_url}
                </a>
              </div>
            )}
          </SectionCard>

          <div className="space-y-5">
            <SectionCard title="Next milestone">
              {nextMilestone ? (
                <div>
                  <div className="font-medium">{nextMilestone.title}</div>
                  {nextMilestone.due_at && <div className="text-xs text-[var(--muted)] mt-1">Due {formatDate(nextMilestone.due_at)}</div>}
                  <Progress value={nextMilestone.completion_pct} className="mt-3" />
                  <div className="text-xs text-[var(--muted)] mt-1.5">{nextMilestone.completion_pct}% complete</div>
                </div>
              ) : (
                <div className="text-sm text-[var(--muted)]">All milestones complete 🎉</div>
              )}
            </SectionCard>
            <SectionCard title="Team">
              {team.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">Team will appear here.</div>
              ) : (
                <div className="space-y-3">
                  {team.map((m) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <Avatar name={nameFromEmail(m.email)} size={32} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{nameFromEmail(m.email)}</div>
                        <div className="text-xs text-[var(--muted)] capitalize">{m.role?.replace(/_/g, " ") || "Member"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* Timeline */}
      {tab === "Timeline" && (
        <SectionCard title="Project activity" className="cp-animate-in">
          {timeline.length === 0 ? (
            <div className="py-6 text-center text-sm text-[var(--muted)]">
              No updates published yet. Your project manager will share progress here.
            </div>
          ) : (
            <div>
              {timeline.map((e, i) => (
                <TimelineItem key={e.id} eventType={e.event_type} title={e.title} body={e.body} time={relativeTime(e.created_at)} last={i === timeline.length - 1} />
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Milestones */}
      {tab === "Milestones" && (
        <div className="space-y-3 cp-animate-in">
          {milestones.length === 0 && <Empty title="No milestones yet" hint="Milestones will show up as your team plans the roadmap." icon={Flag} />}
          {milestones.map((m) => {
            const done = m.status === "completed" || m.status === "done";
            const inProgress = m.completion_pct > 0 && !done;
            const StatusIco = done ? CheckCircle2 : inProgress ? Clock : Circle;
            return (
              <Card key={m.id}>
                <div className="flex items-start gap-3">
                  <StatusIco size={20} className={cn("mt-0.5 shrink-0", done ? "text-[var(--ok)]" : inProgress ? "text-[var(--warn)]" : "text-[var(--muted-2)]")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{m.title}</div>
                      <Badge status={done ? "completed" : inProgress ? "in_progress" : "pending"} />
                    </div>
                    {m.description && <div className="text-sm text-[var(--muted)] mt-1">{m.description}</div>}
                    <div className="flex items-center gap-3 mt-3">
                      <Progress value={done ? 100 : m.completion_pct} tone={done ? "ok" : "brand"} />
                      <span className="text-xs font-medium w-9 text-right">{done ? 100 : m.completion_pct}%</span>
                    </div>
                    {m.due_at && <div className="text-xs text-[var(--muted)] mt-2">Due {formatDate(m.due_at)}</div>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tasks */}
      {tab === "Tasks" && (
        <div className="space-y-4 cp-animate-in">
          <SectionCard title="Progress summary">
            <TaskProgressSummary progress={taskProgress} projectId={id} />
          </SectionCard>
          <div className="space-y-3">
          {tasks.length === 0 && (
            <Empty
              title="No tasks yet"
              hint="Work items will appear here as your team tracks delivery on this project."
              icon={CheckCircle2}
            />
          )}
          {tasks.length > 0 && openActionable.length === 0 && (
            <div className="text-sm text-[var(--muted)] px-1">
              {openTasks.length > 0
                ? `${openTasks.length} task${openTasks.length === 1 ? "" : "s"} in progress by your team. Tasks assigned to you will appear with a Mark done action.`
                : "All tasks complete. Your team will assign new items when they need your input."}
            </div>
          )}
          {tasks.map((t) => {
            const done = t.status === "done";
            const actionable = t.client_actionable === true;
            return (
              <Card key={t.id} className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {actionable ? (
                    <button onClick={() => !done && completeTask(t.id)} className="mt-0.5 shrink-0" aria-label="complete">
                      {done ? <CheckCircle2 size={20} className="text-[var(--ok)]" /> : <Circle size={20} className="text-[var(--muted-2)] hover:text-[var(--brand)]" />}
                    </button>
                  ) : (
                    <div className="mt-0.5 shrink-0">
                      {done ? <CheckCircle2 size={20} className="text-[var(--ok)]" /> : <Circle size={20} className="text-[var(--muted-2)]" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={cn("font-medium", done && "line-through text-[var(--muted)]")}>{t.title}</div>
                      {!actionable && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Team
                        </span>
                      )}
                    </div>
                    {t.description && <div className="text-sm text-[var(--muted)] mt-0.5">{t.description}</div>}
                    {t.due_at && <div className="text-xs text-[var(--muted)] mt-1">Due {formatDate(t.due_at)}</div>}
                  </div>
                </div>
                {done ? (
                  <Badge status="done" />
                ) : actionable ? (
                  <Btn onClick={() => completeTask(t.id)} className="px-3 py-1.5 text-xs shrink-0">Mark done</Btn>
                ) : (
                  <Badge status={t.status} />
                )}
              </Card>
            );
          })}
          </div>
        </div>
      )}

      {/* Scope */}
      {tab === "Scope" && (
        <div className="cp-animate-in">
          {scope.length === 0 ? (
            <Empty title="No scope published yet" hint="Your project's inclusions and boundaries will be listed here." icon={FileText} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {Object.entries(
                scope.reduce<Record<string, ScopeItem[]>>((acc, s) => {
                  const key = s.category || "Included";
                  (acc[key] ??= []).push(s);
                  return acc;
                }, {}),
              ).map(([category, items]) => {
                const notIncluded = /not|exclud/i.test(category);
                const extra = /extra|charge|addon|add-on/i.test(category);
                return (
                  <SectionCard key={category} title={category} className="h-full">
                    <div className="space-y-2.5">
                      {items.map((s) => (
                        <div key={s.id} className="flex items-start gap-2.5">
                          {notIncluded ? (
                            <Ban size={16} className="text-[var(--muted-2)] mt-0.5 shrink-0" />
                          ) : extra ? (
                            <Receipt size={16} className="text-[var(--warn)] mt-0.5 shrink-0" />
                          ) : (
                            <Check size={16} className="text-[var(--ok)] mt-0.5 shrink-0" />
                          )}
                          <div>
                            <div className="text-sm font-medium">{s.title}</div>
                            {s.description && <div className="text-xs text-[var(--muted)]">{s.description}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "Files" && <ProjectFilesPanel projectId={id} embedded />}

      {/* Changes / Revisions */}
      {tab === "Changes" && (
        <div className="space-y-3 cp-animate-in">
          <div className="flex justify-end">
            <Btn onClick={() => setChangeOpen(true)}><GitPullRequestArrow size={15} /> Request a change</Btn>
          </div>
          {revisions.length === 0 ? (
            <Empty title="No change requests" hint="Need something adjusted? Request a change and your team will pick it up." icon={GitPullRequestArrow} action={<Btn onClick={() => setChangeOpen(true)}>Request a change</Btn>} />
          ) : (
            revisions.map((r) => (
              <Card key={r.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Revision #{r.revision_number}</div>
                  <div className="font-medium mt-0.5">{r.description}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">Requested {relativeTime(r.created_at)}</div>
                </div>
                <Badge status={r.status} />
              </Card>
            ))
          )}
        </div>
      )}

      {changeOpen && (
        <RequestChangeModal
          projectId={id}
          onClose={() => setChangeOpen(false)}
          onDone={() => {
            setChangeOpen(false);
            setTab("Changes");
            loadRevisions();
          }}
        />
      )}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="font-semibold mt-0.5 truncate capitalize">{value}</div>
    </div>
  );
}

function SnapRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="font-medium mt-1 capitalize">{value}</div>
    </div>
  );
}

function RequestChangeModal({ projectId, onClose, onDone }: { projectId: string; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/projects/${projectId}/revisions`, { method: "POST", body: JSON.stringify({ description: text.trim() }) });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4 cp-animate-in" onClick={onClose}>
      <div className="bg-[var(--panel)] rounded-2xl w-full max-w-md shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="font-semibold flex items-center gap-2"><GitPullRequestArrow size={17} /> Request a change</div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)]"><X size={18} /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-[var(--muted)] mb-3">Describe what you'd like changed. Your team will review and follow up.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            autoFocus
            placeholder="e.g. Make the homepage logo smaller and use the navy brand colour."
            className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-accent)] resize-none"
          />
          {err && <div className="text-sm text-[var(--danger)] mt-2">{err}</div>}
          <div className="flex gap-2 mt-4">
            <Btn onClick={submit} disabled={busy || !text.trim()} className="flex-1">
              {busy ? "Sending…" : <><Sparkles size={15} /> Submit request</>}
            </Btn>
            <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
