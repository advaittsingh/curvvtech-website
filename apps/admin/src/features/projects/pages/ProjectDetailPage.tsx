import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PhaseProgressBar } from "../components/PhaseProgressBar";
import { ProjectCommandHeader } from "../components/ProjectCommandHeader";
import { ProjectIntelligencePanel } from "../components/ProjectIntelligencePanel";
import { ProjectActivityFeed } from "../components/ProjectActivityFeed";
import { ProjectClientCard } from "../components/ProjectClientCard";
import { ProjectBudgetCard } from "../components/ProjectBudgetCard";
import { ProjectTaskBoard } from "../components/ProjectTaskBoard";
import { ProjectTimelineTab } from "../components/ProjectTimelineTab";
import { ProjectFilesGrouped } from "../components/ProjectFilesGrouped";
import { ProjectInvoicesTab } from "../components/ProjectInvoicesTab";
import { ProjectNotesTab } from "../components/ProjectNotesTab";
import { ProjectTeamTab } from "../components/ProjectTeamTab";
import { ProjectPortalCard } from "../components/ProjectPortalCard";
import type {
  NoteType,
  ProjectInvoice,
  ProjectMember,
  ProjectMilestone,
  ProjectNote,
  ProjectRecord,
  ProjectSummary,
  ProjectTask,
} from "../project-schemas";
import {
  buildPhasesFromProgress,
  formatInr,
  formatShortDate,
  resolveIntel,
} from "../project-schemas";

const TAB_ITEMS = ["overview", "tasks", "timeline", "files", "invoices", "notes", "team", "portal"] as const;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [planLoading, setPlanLoading] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDue, setMilestoneDue] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("internal");
  const [noteFilter, setNoteFilter] = useState<"all" | NoteType>("all");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetDirty, setBudgetDirty] = useState(false);

  const { data: project, error } = useQuery({
    queryKey: ["admin", "projects", id],
    queryFn: () => api.projects.get(id!) as Promise<ProjectRecord>,
    enabled: Boolean(id),
  });

  const { data: summary } = useQuery({
    queryKey: ["admin", "projects", id, "summary"],
    queryFn: () => api.projects.summary(id!) as Promise<ProjectSummary>,
    enabled: Boolean(id),
  });

  const { data: milestones } = useQuery({
    queryKey: ["admin", "projects", id, "milestones"],
    queryFn: () => api.projects.milestones(id!) as Promise<ProjectMilestone[]>,
    enabled: Boolean(id),
  });

  const { data: updates } = useQuery({
    queryKey: ["admin", "projects", id, "updates"],
    queryFn: () => api.projects.updates(id!) as Promise<ProjectNote[]>,
    enabled: Boolean(id),
  });

  const { data: projectMembers } = useQuery({
    queryKey: ["admin", "projects", id, "members"],
    queryFn: () => api.projects.members(id!) as Promise<ProjectMember[]>,
    enabled: Boolean(id),
  });

  const { data: tasks } = useQuery({
    queryKey: ["admin", "tasks", id],
    queryFn: () => api.tasks.list({ project_id: id }) as Promise<ProjectTask[]>,
    enabled: Boolean(id),
  });

  const { data: files } = useQuery({
    queryKey: ["admin", "files", id],
    queryFn: () => api.files.list({ project_id: id }),
    enabled: Boolean(id),
  });

  const { data: invoices } = useQuery({
    queryKey: ["admin", "invoices"],
    queryFn: () => api.invoices.list() as Promise<ProjectInvoice[]>,
  });

  const { data: team } = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => api.team.members() as Promise<{ user_id: string; email?: string }[]>,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin", "projects", id] });
    qc.invalidateQueries({ queryKey: ["admin", "projects", id, "summary"] });
    qc.invalidateQueries({ queryKey: ["admin", "projects", id, "activity"] });
    qc.invalidateQueries({ queryKey: ["admin", "projects", id, "milestones"] });
    qc.invalidateQueries({ queryKey: ["admin", "tasks", id] });
  };

  const analyze = useMutation({
    mutationFn: () => api.projects.analyze(id!),
    onSuccess: () => invalidateAll(),
    onError: (e: Error) => toast({ title: "Analysis failed", description: e.message, variant: "destructive" }),
  });

  const generatePlan = useMutation({
    mutationFn: () => api.projects.generatePlan(id!),
    onSuccess: (plan: { estimated_duration_days?: number; suggested_task_count?: number }) => {
      invalidateAll();
      toast({
        title: "Project plan generated",
        description: `${plan.estimated_duration_days ?? 21} days · ${plan.suggested_task_count ?? 0} suggested tasks`,
      });
    },
    onError: (e: Error) => toast({ title: "Plan failed", description: e.message, variant: "destructive" }),
  });

  const analyzeStarted = useRef(false);

  useEffect(() => {
    if (!project || budgetDirty) return;
    setBudget(project.budget_cents ? String(Number(project.budget_cents) / 100) : "");
    setStartDate(project.start_date ? String(project.start_date).slice(0, 10) : "");
    setEndDate(project.target_end_date ? String(project.target_end_date).slice(0, 10) : "");
  }, [project?.budget_cents, project?.start_date, project?.target_end_date, budgetDirty]);

  const patchProject = useMutation({
    mutationFn: (body: object) => api.projects.update(id!, body),
    onSuccess: () => { invalidateAll(); setBudgetDirty(false); toast({ title: "Saved" }); },
  });

  const addMilestone = useMutation({
    mutationFn: () => api.projects.addMilestone(id!, { title: milestoneTitle, due_at: milestoneDue || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", id, "milestones"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects", id, "activity"] });
      setMilestoneTitle(""); setMilestoneDue("");
      toast({ title: "Milestone added" });
    },
  });

  const completeMilestone = useMutation({
    mutationFn: (mid: string) => api.projects.updateMilestone(id!, mid, { completed_at: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", id, "milestones"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects", id, "activity"] });
    },
  });

  const addNote = useMutation({
    mutationFn: () =>
      api.projects.addUpdate(id!, {
        body: noteBody,
        visibility: noteType === "client" ? "client" : "internal",
        note_type: noteType,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", id, "updates"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects", id, "activity"] });
      setNoteBody("");
      toast({ title: "Note posted" });
    },
  });

  const addMember = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.projects.addMember(id!, { user_id: userId, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "projects", id, "members"] }),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => api.projects.removeMember(id!, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "projects", id, "members"] }),
  });

  const createInvoice = useMutation({
    mutationFn: () =>
      api.invoices.create({
        client_id: project?.client_id,
        project_id: id,
        invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
        status: "draft",
      }),
    onSuccess: (inv: { id?: string }) => {
      if (inv?.id) navigate(`/invoices/${inv.id}`);
    },
  });

  useEffect(() => {
    if (!project || project.analyzed_at || analyzeStarted.current) return;
    analyzeStarted.current = true;
    analyze.mutate();
  }, [project?.id, project?.analyzed_at]);

  const p = project && !("error" in (project as object)) ? project : null;

  async function downloadFile(fileId: string) {
    const res = await api.files.downloadUrl(fileId);
    if (res.url) window.open(res.url, "_blank");
    else toast({ title: "Download unavailable", variant: "destructive" });
  }

  function saveBudget() {
    patchProject.mutate({
      budget_cents: budget ? Math.round(Number(budget) * 100) : null,
      start_date: startDate || null,
      target_end_date: endDate || null,
    });
  }

  function runGeneratePlan() {
    setPlanLoading(true);
    generatePlan.mutate(undefined, { onSettled: () => setPlanLoading(false) });
  }

  if (!p) return <div className="p-6 text-muted-foreground">Project not found.</div>;

  const ms = Array.isArray(milestones) ? milestones : [];
  const ups = Array.isArray(updates) ? updates : [];
  const memberList = Array.isArray(projectMembers) ? projectMembers : [];
  const taskList = Array.isArray(tasks) ? tasks : [];
  const fileList = Array.isArray(files) ? files : [];
  const invoiceList = Array.isArray(invoices) ? invoices.filter((i) => i.project_id === id) : [];
  const allMembers = Array.isArray(team) ? team : [];
  const assignedIds = new Set(memberList.map((m) => m.user_id));
  const availableMembers = allMembers.filter((m) => !assignedIds.has(m.user_id));
  const intel = resolveIntel(p, summary);
  const phases = intel.delivery_phases ?? buildPhasesFromProgress(Number(p.progress_pct ?? 0));

  return (
    <div className="p-6 lg:px-8 max-w-7xl mx-auto space-y-4">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>
      <BackendErrorAlert error={error} />

      <ProjectCommandHeader project={p} summary={summary} />

      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          size="sm"
          className="gap-1.5 font-semibold shadow-sm"
          onClick={runGeneratePlan}
          disabled={planLoading || generatePlan.isPending}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate project plan
        </Button>
        <Button variant="outline" size="sm" onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending}>
          Create invoice
        </Button>
        <Button variant="ghost" size="sm" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
          AI report
        </Button>
      </div>

      <PhaseProgressBar phases={phases} />

      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        <div className="min-w-0">
          <Tabs defaultValue="overview" className="space-y-3">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 w-full justify-start">
              {TAB_ITEMS.map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className={cn(
                    "capitalize rounded-full px-4 py-2 text-sm border border-transparent",
                    "data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm",
                    "data-[state=inactive]:bg-muted/50 data-[state=inactive]:hover:bg-muted",
                  )}
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-0 space-y-3">
              <section className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project snapshot</h3>
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <Row label="Client" value={p.client_name ?? "—"} />
                  <Row label="Project type" value={intel.project_type ?? "Custom software"} />
                  <Row label="Budget" value={formatInr(summary?.budget_cents ?? p.budget_cents)} />
                  <Row label="Collected" value={formatInr(summary?.collected_cents)} />
                  <Row label="Outstanding" value={formatInr(summary?.pending_cents)} />
                  <Row label="Owner" value={summary?.manager_email?.split("@")[0] ?? "Unassigned"} />
                  <Row label="Created" value={p.createdAt ? formatShortDate(p.createdAt) : "—"} />
                </dl>
              </section>
              <ProjectBudgetCard
                project={p}
                budget={budget}
                startDate={startDate}
                endDate={endDate}
                onBudget={(v) => { setBudget(v); setBudgetDirty(true); }}
                onStart={(v) => { setStartDate(v); setBudgetDirty(true); }}
                onEnd={(v) => { setEndDate(v); setBudgetDirty(true); }}
                onSave={saveBudget}
                saving={patchProject.isPending}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <ProjectTaskBoard
                projectId={id!}
                tasks={taskList}
                onGeneratePlan={runGeneratePlan}
                planLoading={planLoading || generatePlan.isPending}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <ProjectTimelineTab
                milestones={ms}
                title={milestoneTitle}
                due={milestoneDue}
                onTitle={setMilestoneTitle}
                onDue={setMilestoneDue}
                onAdd={() => addMilestone.mutate()}
                adding={addMilestone.isPending}
                onComplete={(mid) => completeMilestone.mutate(mid)}
              />
            </TabsContent>

            <TabsContent value="files" className="mt-0">
              <Button variant="link" className="px-0 mb-2 gap-1 h-auto" onClick={() => navigate(`/files?project_id=${id}`)}>
                <ExternalLink className="h-4 w-4" /> Upload in Files
              </Button>
              <ProjectFilesGrouped files={fileList} onDownload={downloadFile} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-0">
              <ProjectInvoicesTab invoices={invoiceList} summary={summary} />
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <ProjectNotesTab
                notes={ups}
                body={noteBody}
                noteType={noteType}
                filter={noteFilter}
                onBody={setNoteBody}
                onType={setNoteType}
                onFilter={setNoteFilter}
                onPost={() => addNote.mutate()}
                posting={addNote.isPending}
              />
            </TabsContent>

            <TabsContent value="team" className="mt-0">
              <ProjectTeamTab
                members={memberList}
                tasks={taskList}
                available={availableMembers}
                onAdd={(userId, role) => addMember.mutate({ userId, role })}
                onRemove={(userId) => removeMember.mutate(userId)}
              />
            </TabsContent>

            <TabsContent value="portal" className="mt-0">
              <ProjectPortalCard summary={summary} clientId={p.client_id} fileCount={fileList.length} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4">
          <ProjectClientCard project={p} summary={summary} />
          <ProjectActivityFeed projectId={id!} />
          <ProjectIntelligencePanel intel={intel} loading={analyze.isPending && !p.analyzed_at} compact />
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground w-24 shrink-0">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
