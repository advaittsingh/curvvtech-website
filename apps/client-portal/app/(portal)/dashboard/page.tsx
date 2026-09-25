"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  CreditCard,
  CalendarDays,
  ListChecks,
  ArrowRight,
  FolderKanban,
  TrendingUp,
  Bell,
  Wallet,
  Sparkles,
  ChevronRight,
  Activity as Activity_,
  Mail,
  MessageCircle,
  Users,
} from "lucide-react";
import { api, money } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { TaskProgressSummary } from "@/components/project/TaskProgressSummary";
import {
  Card,
  SectionCard,
  StatTile,
  Ring,
  HealthPill,
  Avatar,
  Btn,
  ActionItem,
  TimelineItem,
  Skeleton,
  relativeTime,
  formatDate,
  deriveHealth,
  type HealthLevel,
} from "@/components/ui";

const EMPTY_ACTION_CENTER = {
  approvals: [] as ApprovalLite[],
  unpaid_invoices: [] as InvoiceLite[],
  next_meeting: null as MeetingLite,
  open_tasks: [] as TaskLite[],
};

/** Tolerate older API payloads that omit hero / action_center / team. */
function normalizeDashboard(raw: Partial<Dashboard> & Record<string, unknown>): Dashboard {
  const projects = ((raw.projects ?? []) as Omit<Project, "health">[]).map((p) => ({
    ...p,
    health: (p as Project).health ?? deriveHealth(p),
  }));
  const heroRaw = (raw.hero as Omit<Project, "health"> | null | undefined) ?? projects[0] ?? null;
  const hero = heroRaw ? { ...heroRaw, health: (heroRaw as Project).health ?? deriveHealth(heroRaw) } : null;

  return {
    client: (raw.client as Dashboard["client"]) ?? null,
    stats: (raw.stats as Dashboard["stats"]) ?? {
      active_projects: projects.length,
      avg_progress: 0,
      pending_invoice_cents: 0,
      unread_notifications: 0,
    },
    hero,
    team: (raw.team as TeamMember[]) ?? [],
    action_center: (raw.action_center as Dashboard["action_center"]) ?? EMPTY_ACTION_CENTER,
    projects,
    task_progress: (raw.task_progress as TaskProgress[]) ?? [],
    recent_activity: (raw.recent_activity as Activity[]) ?? [],
  };
}

type ProjectPerson = { id: string; name: string; role: string };
type Project = { id: string; name: string; status: string; progress_pct: number; current_phase: string | null; target_end_date: string | null; health: HealthLevel; project_manager?: ProjectPerson | null };
type TeamMember = { id: string; email: string; role: string; name?: string | null; role_label?: string | null; is_manager?: boolean };
type ApprovalLite = { id: string; title: string; entity_type: string; created_at: string };
type InvoiceLite = { id: string; invoice_number: string; total_cents: number; amount_cents: number; due_at: string | null };
type MeetingLite = { id: string; title: string; starts_at: string; meet_url: string | null } | null;
type TaskLite = { id: string; title: string; due_at: string | null; project_id: string | null };
type Activity = { id: string; title: string; body?: string | null; created_at: string; event_type: string; actor_name?: string | null };

type TaskProgress = { project_id: string; total: number; done: number; remaining: number; client_visible_total: number; client_visible_open: number };

type Dashboard = {
  client: { name: string; company: string | null } | null;
  stats: { active_projects: number; avg_progress: number; pending_invoice_cents: number; unread_notifications: number };
  hero: Project | null;
  team: TeamMember[];
  action_center: { approvals: ApprovalLite[]; unpaid_invoices: InvoiceLite[]; next_meeting: MeetingLite; open_tasks: TaskLite[] };
  projects: Project[];
  task_progress?: TaskProgress[];
  recent_activity: Activity[];
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function nameFromEmail(email: string): string {
  return email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const { setSelectedProjectId } = useWorkspace();

  useEffect(() => {
    api<Partial<Dashboard>>("/dashboard")
      .then((raw) => setData(normalizeDashboard(raw)))
      .catch((e) => setError(e.message));
    const poll = setInterval(() => {
      api<Partial<Dashboard>>("/dashboard")
        .then((raw) => setData(normalizeDashboard(raw)))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(poll);
  }, []);

  if (error) return <Card className="text-[var(--danger)]">{error}</Card>;

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-44 w-full" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const firstName = data.client?.name?.split(" ")[0] ?? "there";
  const hero = data.hero;
  const ac = data.action_center ?? EMPTY_ACTION_CENTER;
  const actionCount =
    ac.approvals.length + ac.unpaid_invoices.length + (ac.next_meeting ? 1 : 0) + ac.open_tasks.length;

  // ── "Today at a glance": a deterministic summary that answers the three
  // questions every client opens the portal with. Built entirely from data we
  // already have (activity + action center + hero) so it's always accurate.
  const latest = data.recent_activity[0] ?? null;
  const happening = latest ? latest.title : "Setup is underway — your team is getting started.";
  const blocking =
    ac.approvals.length > 0
      ? `${ac.approvals.length} item${ac.approvals.length === 1 ? "" : "s"} awaiting your approval`
      : ac.unpaid_invoices.length > 0
        ? `${ac.unpaid_invoices.length} invoice${ac.unpaid_invoices.length === 1 ? "" : "s"} to pay`
        : ac.open_tasks.length > 0
          ? `${ac.open_tasks.length} task${ac.open_tasks.length === 1 ? "" : "s"} need your input`
          : "Nothing needs you right now";
  const nextUp = ac.next_meeting
    ? `${ac.next_meeting.title} · ${relativeTime(ac.next_meeting.starts_at)}`
    : hero?.target_end_date
      ? `Delivery expected ${formatDate(hero.target_end_date)}`
      : hero?.current_phase
        ? `Up next: ${hero.current_phase}`
        : "Planning underway";

  return (
    <div className="space-y-6 cp-animate">
      {/* Greeting */}
      <div>
        <div className="text-2xl font-bold tracking-tight">
          {greeting()}, {firstName} <span className="align-middle">👋</span>
        </div>
        <p className="text-[var(--muted)] mt-1">
          {hero
            ? `Your project is ${hero.health === "at_risk" ? "behind schedule" : hero.health === "done" ? "complete" : "on track"}.`
            : "Here's your project workspace."}
        </p>
      </div>

      {/* Today at a glance — happening / blocking / next */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-[var(--border)]">
          <Sparkles size={15} className="text-[var(--brand-accent)]" />
          <span className="text-sm font-semibold">Today at a glance</span>
        </div>
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
          <GlanceItem tone="ok" icon={TrendingUp} label="What's happening" value={happening} />
          <GlanceItem
            tone={ac.approvals.length || ac.unpaid_invoices.length || ac.open_tasks.length ? "orange" : "ok"}
            icon={ac.unpaid_invoices.length && !ac.approvals.length ? CreditCard : CheckSquare}
            label="What's blocking you"
            value={blocking}
          />
          <GlanceItem tone="purple" icon={CalendarDays} label="What's next" value={nextUp} />
        </div>
      </Card>

      {/* Action Center — first */}
      <SectionCard
        title="Things to do"
        icon={CheckSquare}
        action={actionCount > 0 ? <span className="text-xs font-semibold rounded-full bg-[var(--brand)] text-white px-2 py-0.5">{actionCount}</span> : null}
        bodyClassName="py-1"
      >
        {actionCount === 0 ? (
          <div className="py-8 text-center">
            <div className="text-sm font-medium">You're all caught up 🎉</div>
            <div className="text-xs text-[var(--muted)] mt-1">No approvals, payments, meetings, or tasks waiting on you.</div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {ac.approvals.map((a) => (
              <ActionItem key={`ap-${a.id}`} icon={CheckSquare} tone="info" title={a.title} meta={`${a.entity_type.replace(/_/g, " ")} · requested ${relativeTime(a.created_at)}`} cta={<Btn href="/approvals" variant="soft" className="px-3 py-1.5 text-xs">Review</Btn>} />
            ))}
            {ac.unpaid_invoices.map((inv) => (
              <ActionItem key={`inv-${inv.id}`} icon={CreditCard} tone="warn" title={`Invoice ${inv.invoice_number}`} meta={inv.due_at ? `Due ${formatDate(inv.due_at)}` : "Payment pending"} cta={<div className="flex items-center gap-2"><span className="text-sm font-semibold">{money(inv.total_cents || inv.amount_cents)}</span><Btn href="/billing" className="px-3 py-1.5 text-xs">Pay now</Btn></div>} />
            ))}
            {ac.next_meeting && (
              <ActionItem icon={CalendarDays} tone="info" title={ac.next_meeting.title} meta={`Meeting ${relativeTime(ac.next_meeting.starts_at)}`} cta={ac.next_meeting.meet_url ? <a href={ac.next_meeting.meet_url} target="_blank" rel="noreferrer"><Btn variant="soft" className="px-3 py-1.5 text-xs">Join</Btn></a> : <Btn href="/meetings" variant="soft" className="px-3 py-1.5 text-xs">Details</Btn>} />
            )}
            {ac.open_tasks.map((t) => (
              <ActionItem
                key={`t-${t.id}`}
                icon={ListChecks}
                tone="brand"
                title={t.title}
                meta={t.due_at ? `Due ${formatDate(t.due_at)}` : "Assigned to you"}
                cta={
                  <Btn
                    href={t.project_id ? `/projects/${t.project_id}?tab=Tasks` : "/projects"}
                    variant="soft"
                    className="px-3 py-1.5 text-xs"
                  >
                    View task
                  </Btn>
                }
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* All projects — show up to 2; rest via View all */}
      {data.projects.length > 0 && (
        <SectionCard
          title={data.projects.length === 1 ? "Your project" : "Your projects"}
          icon={FolderKanban}
          action={
            data.projects.length > 2 ? (
              <Link href="/projects" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]">
                View all
              </Link>
            ) : null
          }
        >
          <div className="grid md:grid-cols-2 gap-4">
            {data.projects.slice(0, 2).map((p) => {
              const tp = data.task_progress?.find((t) => t.project_id === p.id);
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  onClick={() => setSelectedProjectId(p.id)}
                  className="block rounded-xl border border-[var(--border)] p-4 hover:border-[var(--brand)]/40 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-[var(--muted)] mt-0.5 capitalize">{p.current_phase ?? p.status.replace(/_/g, " ")}</div>
                    </div>
                    <HealthPill level={p.health} />
                  </div>
                  <div className="mt-4">
                    <TaskProgressSummary progress={tp ?? null} projectId={p.id} compact showBar={false} />
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Project Health (selected / hero) */}
      {hero && (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 min-w-0">
              <Activity_ className="h-4 w-4 text-[var(--muted)]" />
              <span className="text-sm font-semibold">Project health</span>
            </div>
            <HealthPill level={hero.health} />
          </div>
          <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
            <Ring value={hero.progress_pct} size={96} stroke={9} color="var(--brand-accent)">
              <div className="text-center">
                <div className="text-2xl font-bold leading-none">{hero.progress_pct}%</div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mt-0.5">done</div>
              </div>
            </Ring>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{hero.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 mt-4">
                <MiniStat label="Current stage" value={hero.current_phase ?? "In progress"} className="capitalize" />
                <MiniStat label="Expected delivery" value={hero.target_end_date ? formatDate(hero.target_end_date) : "Being planned"} />
                <MiniStat label="Status" value={hero.status.replace(/_/g, " ")} className="capitalize" />
                {hero.project_manager ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Project manager</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Avatar name={hero.project_manager.name} size={20} online />
                      <span className="font-semibold truncate">{hero.project_manager.name}</span>
                    </div>
                  </div>
                ) : (
                  <MiniStat label="Project manager" value="Not assigned yet" />
                )}
              </div>
            </div>

            <div className="flex md:flex-col gap-2 md:w-40 shrink-0">
              <Btn href="/project" size="sm" className="w-full">
                Open workspace <ArrowRight size={14} />
              </Btn>
              <Btn href="/inbox" variant="outline" size="sm" className="w-full">
                Message team
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Secondary stats — right below health so context reads top-down */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Active projects" value={String(data.stats.active_projects)} icon={FolderKanban} tone="info" />
        <StatTile label="Avg progress" value={`${data.stats.avg_progress}%`} icon={TrendingUp} tone="ok" />
        <StatTile label="Pending invoices" value={money(data.stats.pending_invoice_cents)} icon={Wallet} tone="warn" />
        <StatTile label="Notifications" value={String(data.stats.unread_notifications)} hint="unread" icon={Bell} tone="brand" />
      </div>

      {/* Timeline + Team */}
      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Recent activity" icon={TrendingUp} className="lg:col-span-2" action={<Link href="/journal" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1">Activity feed <ChevronRight size={13} /></Link>}>
          {data.recent_activity.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--muted)]">
              No updates yet. Your team will post progress here as work happens.
            </div>
          ) : (
            <div>
              {data.recent_activity.map((a, i) => (
                <TimelineItem
                  key={a.id}
                  eventType={a.event_type}
                  title={a.title}
                  body={a.body}
                  actorName={a.actor_name}
                  time={relativeTime(a.created_at)}
                  last={i === data.recent_activity.length - 1}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Your team" icon={Users}>
          {data.team.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-11 w-11 rounded-2xl bg-black/[0.04] flex items-center justify-center mb-3">
                <Users size={20} className="text-[var(--muted-2)]" />
              </div>
              <div className="text-sm font-medium">Your team is being assembled</div>
              <div className="text-xs text-[var(--muted)] mt-1 max-w-[15rem] mx-auto">
                Your project manager will introduce the people building your project here once work begins.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {data.team.map((m) => {
                const displayName = m.name || nameFromEmail(m.email);
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar name={displayName} size={38} online={m.is_manager || undefined} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-medium truncate">{displayName}</div>
                        {m.is_manager && (
                          <span className="shrink-0 rounded-full bg-[var(--info-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--info)]">PM</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{m.role_label || m.role?.replace(/_/g, " ") || "Team member"}</div>
                    </div>
                    <a href={`mailto:${m.email}`} className="text-[var(--muted-2)] hover:text-[var(--text)]" title={`Email ${displayName}`}>
                      <Mail size={15} />
                    </a>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <Btn href="/inbox" size="sm" className="flex-1"><MessageCircle size={14} /> Message</Btn>
                <Btn href="/team" variant="outline" size="sm" className="flex-1">View team</Btn>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function MiniStat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className={`font-semibold mt-0.5 truncate ${className ?? ""}`}>{value}</div>
    </div>
  );
}

const GLANCE_TONE: Record<string, string> = {
  ok: "bg-[var(--ok-bg)] text-[var(--ok)]",
  orange: "bg-[var(--orange-bg)] text-[var(--orange)]",
  purple: "bg-[var(--purple-bg)] text-[var(--purple)]",
};

function GlanceItem({
  tone,
  icon: Icon,
  label,
  value,
}: {
  tone: "ok" | "orange" | "purple";
  icon: typeof CheckSquare;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-5">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${GLANCE_TONE[tone]}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
        <div className="text-sm font-medium mt-1 leading-snug">{value}</div>
      </div>
    </div>
  );
}
