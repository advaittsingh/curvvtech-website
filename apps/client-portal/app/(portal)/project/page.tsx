"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  CalendarDays,
  FolderOpen,
  Receipt,
  GitPullRequestArrow,
  ArrowRight,
  BellRing,
} from "lucide-react";
import {
  Card,
  SectionCard,
  Ring,
  HealthPill,
  Avatar,
  QuickAction,
  Skeleton,
  Breadcrumbs,
  formatDate,
  relativeTime,
  PageHeader,
} from "@/components/ui";
import { api } from "@/lib/api";
import { TaskProgressSummary } from "@/components/project/TaskProgressSummary";
import { nameFromEmail, useProjectWorkspace } from "@/components/project/useProjectWorkspace";

type InvoiceLite = { id: string; status: string };

export default function ProjectOverviewPage() {
  const { project, team, files, tasks, taskProgress, loading } = useProjectWorkspace();
  const [invoices, setInvoices] = useState<InvoiceLite[]>([]);

  useEffect(() => {
    api<{ invoices: InvoiceLite[] }>("/invoices")
      .then((r) => setInvoices(r.invoices ?? []))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!project) return null;

  const teamPm = team.find((m) => m.is_manager) ?? team.find((m) => /manager|pm|lead/i.test(m.role)) ?? team[0];
  const pm = project.project_manager ?? (teamPm ? { name: teamPm.name || nameFromEmail(teamPm.email), role: teamPm.role_label || teamPm.role } : null);

  const startedLabel = project.start_date ? formatDate(project.start_date) : "Being scheduled";
  const deliveryLabel = project.target_end_date ? formatDate(project.target_end_date) : "Will appear after planning";

  const unpaidCount = invoices.filter((i) => i.status !== "paid" && i.status !== "void" && i.status !== "cancelled").length;
  const invoiceMeta = invoices.length === 0 ? "No invoices yet" : unpaidCount > 0 ? `${unpaidCount} awaiting payment` : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`;
  const filesMeta = files.length === 0 ? "No files yet" : `${files.length} file${files.length === 1 ? "" : "s"}`;

  return (
    <div className="cp-animate">
      <Breadcrumbs items={[{ label: "Project", href: "/project" }, { label: "Overview" }]} />
      <PageHeader title={project.name} subtitle="Your project workspace — progress, health, and next steps." />

      <Card className="p-0 overflow-hidden mb-6">
        <div className="p-6 flex flex-col lg:flex-row gap-6">
          <Ring value={project.progress_pct} size={100} stroke={8} color="var(--brand-accent)">
            <div className="text-center">
              <div className="text-2xl font-bold">{project.progress_pct}%</div>
              <div className="text-[10px] uppercase text-[var(--muted)]">done</div>
            </div>
          </Ring>
          <div className="flex-1 grid sm:grid-cols-2 gap-x-6 gap-y-4">
            <Snapshot label="Current phase" value={<span className="capitalize">{project.current_phase ?? "In progress"}</span>} />
            <Snapshot label="Project health" value={<HealthPill level={project.health} />} />
            <Snapshot label="Started" value={startedLabel} />
            <Snapshot label="Expected delivery" value={deliveryLabel} />
            <Snapshot label="Last update" value={relativeTime(project.updated_at)} />
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Project manager</div>
              {pm ? (
                <div className="mt-1.5 flex items-center gap-2.5">
                  <Avatar name={pm.name} size={32} online />
                  <div className="min-w-0">
                    <div className="font-semibold leading-tight truncate">{pm.name}</div>
                    <Link href="/inbox" className="text-xs font-medium text-[var(--brand-accent)] hover:underline">
                      Message
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 flex items-start gap-2">
                  <BellRing size={16} className="mt-0.5 text-[var(--muted-2)]" />
                  <div>
                    <div className="font-semibold leading-tight">Not assigned yet</div>
                    <div className="text-xs text-[var(--muted)]">We'll notify you once assigned.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {taskProgress && taskProgress.total > 0 && (
        <SectionCard title="Task progress" className="mb-6">
          <TaskProgressSummary progress={taskProgress} projectId={project.id} />
        </SectionCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <QuickAction icon={FolderOpen} label="Documents" meta={filesMeta} tone="brand" href="/project/files" />
        <QuickAction icon={Receipt} label="Invoices" meta={invoiceMeta} tone="orange" href="/billing" />
        <QuickAction icon={MessageSquare} label="Support" meta="Message your team" tone="purple" href="/inbox" />
        <QuickAction icon={CalendarDays} label="Meetings" meta="Schedule a call" tone="info" href="/meetings" />
        <QuickAction icon={GitPullRequestArrow} label="Request change" meta="Open a request" tone="warn" href={`/projects/${project.id}`} />
      </div>

      <SectionCard
        title="Explore your project"
        action={
          <Link href={`/projects/${project.id}`} className="text-xs font-medium text-[var(--brand-accent)]">
            Full project view <ArrowRight size={12} className="inline" />
          </Link>
        }
      >
        <p className="text-sm text-[var(--muted)]">
          Use the sidebar to jump to Timeline, Milestones, Files, or the Activity feed — everything your team publishes appears there automatically.
        </p>
      </SectionCard>
    </div>
  );
}

function Snapshot({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}
