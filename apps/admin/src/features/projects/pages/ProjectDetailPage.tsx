import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/app/providers";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PhaseProgressBar } from "../components/PhaseProgressBar";
import { ProjectCommandHeader } from "../components/ProjectCommandHeader";
import { ProjectBudgetCard } from "../components/ProjectBudgetCard";
import { ProjectTaskBoard } from "../components/ProjectTaskBoard";
import { ProjectTimelineTab } from "../components/ProjectTimelineTab";
import { ProjectInvoicesTab } from "../components/ProjectInvoicesTab";
import { ProjectNotesTab } from "../components/ProjectNotesTab";
import { ProjectTeamTab } from "../components/ProjectTeamTab";
import { ProjectPortalCard } from "../components/ProjectPortalCard";
import { ProjectInfoEditor } from "../components/ProjectInfoEditor";
import { ProjectAIManager } from "../components/ProjectAIManager";
import { ProjectHealthPanel } from "../components/ProjectHealthPanel";
import { ProjectActivityTimeline } from "../components/ProjectActivityTimeline";
import { ProjectSummaryCards } from "../components/ProjectSummaryCards";
import { ProjectWorkspaceTabs } from "../components/ProjectWorkspaceNav";
import { ProjectTabHeader } from "../components/ProjectTabHeader";
import { ProjectFinanceDashboard } from "../components/ProjectFinanceDashboard";
import { ProjectAnalyticsPanel } from "../components/ProjectAnalyticsPanel";
import { ProjectFileManager } from "../components/ProjectFileManager";
import { ProjectRichTimeline } from "../components/ProjectRichTimeline";
import { ProjectRevisionsPanel } from "../components/ProjectRevisionsPanel";
import { ProjectChangeOrdersPanel } from "../components/ProjectChangeOrdersPanel";
import { ProjectApprovalsPanel } from "../components/ProjectApprovalsPanel";
import { ProjectScopePanel } from "../components/ProjectScopePanel";
import { ProjectResourcesPanel } from "../components/ProjectResourcesPanel";
import { ProjectDeploymentPanel } from "../components/ProjectDeploymentPanel";
import { ProjectClientCard } from "../components/ProjectClientCard";
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
import { buildPhasesFromProgress, buildFallbackManagerBrief, buildFallbackProjectFinance, buildFallbackProjectAnalytics, deriveProgressPct } from "../project-schemas";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const [planLoading, setPlanLoading] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDue, setMilestoneDue] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("internal");
  const [noteFilter, setNoteFilter] = useState<"all" | NoteType>("all");

  const { data: project, error } = useQuery({
    queryKey: ["admin", "projects", id],
    queryFn: () => api.projects.get(id!) as Promise<ProjectRecord>,
    enabled: Boolean(id),
  });

  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ["admin", "projects", id, "summary"],
    queryFn: () => api.projects.summary(id!) as Promise<ProjectSummary>,
    enabled: Boolean(id),
    retry: 1,
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
    qc.invalidateQueries({ queryKey: ["admin", "projects", id, "feed"] });
    qc.invalidateQueries({ queryKey: ["admin", "projects", id, "milestones"] });
    qc.invalidateQueries({ queryKey: ["admin", "projects", id, "rich-timeline"] });
    qc.invalidateQueries({ queryKey: ["admin", "tasks", id] });
  };

  const analyze = useMutation({
    mutationFn: () => api.projects.analyze(id!),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "AI analysis updated" });
    },
    onError: (err: Error) => {
      toast({ title: "AI analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const generatePlan = useMutation({
    mutationFn: () => api.projects.generatePlan(id!),
    onSuccess: (plan: { estimated_duration_days?: number; suggested_task_count?: number }) => {
      invalidateAll();
      toast({ title: "Plan generated", description: `${plan.estimated_duration_days ?? 21} days · ${plan.suggested_task_count ?? 0} tasks` });
    },
  });

  const analyzeStarted = useRef(false);

  const patchProject = useMutation({
    mutationFn: (body: object) => api.projects.update(id!, body),
    onSuccess: () => { invalidateAll(); toast({ title: "Saved" }); },
  });

  const addMilestone = useMutation({
    mutationFn: () => api.projects.addMilestone(id!, { title: milestoneTitle, due_at: milestoneDue || undefined }),
    onSuccess: () => {
      invalidateAll();
      setMilestoneTitle(""); setMilestoneDue("");
      toast({ title: "Milestone added" });
    },
  });

  const completeMilestone = useMutation({
    mutationFn: (mid: string) => api.projects.updateMilestone(id!, mid, { completed_at: new Date().toISOString(), status: "completed" }),
    onSuccess: () => invalidateAll(),
  });

  const addNote = useMutation({
    mutationFn: () => api.projects.addUpdate(id!, { body: noteBody, visibility: noteType === "client" ? "client" : "internal", note_type: noteType }),
    onSuccess: () => {
      invalidateAll();
      setNoteBody("");
      toast({ title: "Note posted" });
    },
  });

  const addMember = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.projects.addMember(id!, { user_id: userId, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", id, "members"] });
      toast({ title: "Team member assigned" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not assign team member", description: error.message, variant: "destructive" });
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => api.projects.removeMember(id!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", id, "members"] });
      toast({ title: "Team member removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove team member", description: error.message, variant: "destructive" });
    },
  });

  const createInvoice = useMutation({
    mutationFn: () => api.invoices.create({
      client_id: project?.client_id,
      project_id: id,
      invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
      status: "draft",
    }),
    onSuccess: (inv: { id?: string }) => { if (inv?.id) navigate(`/invoices/${inv.id}`); },
  });

  useEffect(() => {
    if (!project || project.analyzed_at || analyzeStarted.current) return;
    analyzeStarted.current = true;
    analyze.mutate();
  }, [project?.id, project?.analyzed_at]);

  const p = project && !("error" in (project as object)) ? project : null;
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
  const effectiveProgress = deriveProgressPct(p, summary);
  const phases = buildPhasesFromProgress(effectiveProgress);

  const userName = user?.email?.split("@")[0];
  const usingFallbackBrief = !summary?.manager_brief && !summaryLoading;
  const brief = summary?.manager_brief
    ? {
        ...summary.manager_brief,
        greeting: userName
          ? summary.manager_brief.greeting.replace(/^Good (morning|afternoon|evening), \w+/, (m) => m.replace(/\w+$/, userName))
          : summary.manager_brief.greeting,
      }
    : usingFallbackBrief
      ? buildFallbackManagerBrief(p, summary, userName)
      : undefined;

  function refreshInsights() {
    void refetchSummary();
    analyze.mutate();
  }

  function handleManagerAction(actionId: string) {
    if (actionId === "send-invoice") createInvoice.mutate();
    else if (actionId === "generate-plan") runGeneratePlan();
    else if (actionId === "deploy-staging") setActiveTab("deployment");
    else if (actionId === "schedule-review" || actionId === "followup-client") setActiveTab("insights");
    else if (actionId === "complete-tasks") setActiveTab("tasks");
    else setActiveTab("insights");
  }

  function runGeneratePlan() {
    setPlanLoading(true);
    generatePlan.mutate(undefined, { onSettled: () => setPlanLoading(false) });
  }

  const patch = (body: object) => patchProject.mutate(body);
  const financeFallback = buildFallbackProjectFinance(p, summary, invoiceList);
  const analyticsFallback = buildFallbackProjectAnalytics(p, summary, taskList, ms);

  return (
    <div className="pb-12 bg-background">
      <div className="px-4 sm:px-6 lg:px-8 pt-4 max-w-6xl mx-auto">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Projects
        </Link>
        <BackendErrorAlert error={error} />
      </div>

      <ProjectCommandHeader
        project={p}
        summary={summary}
        onPatch={patch}
        onGeneratePlan={runGeneratePlan}
        onCreateInvoice={() => createInvoice.mutate()}
        onAnalyze={refreshInsights}
        planLoading={planLoading || generatePlan.isPending}
      />

      <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-4 mt-4">
        <ProjectSummaryCards
          project={p}
          summary={summary}
          onFinanceClick={() => setActiveTab("finance")}
        />

        <PhaseProgressBar phases={phases} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ProjectWorkspaceTabs />

          <TabsContent value="overview" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Overview" description="AI manager, health, and project snapshot" />
            <div className="space-y-4">
              <ProjectAIManager
                brief={brief}
                loading={summaryLoading && !brief}
                error={summaryError && !brief}
                fallback={usingFallbackBrief && Boolean(brief)}
                onAction={handleManagerAction}
                onRetry={refreshInsights}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <ProjectHealthPanel breakdown={summary?.health_breakdown} project={p} />
                <ProjectClientCard project={p} summary={summary} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader
              title="Tasks"
              description={`${summary?.tasks_done ?? 0} of ${summary?.tasks_total ?? taskList.length} complete`}
            />
            <ProjectTaskBoard
              projectId={id!}
              tasks={taskList}
              members={memberList}
              onGeneratePlan={runGeneratePlan}
              planLoading={planLoading || generatePlan.isPending}
            />
          </TabsContent>

          <TabsContent value="team" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader
              title="Project team"
              description="Assign staff members and manage their project roles"
            />
            <ProjectTeamTab
              members={memberList}
              tasks={taskList}
              available={availableMembers}
              onAdd={(userId, role) => addMember.mutate({ userId, role })}
              onRemove={(userId) => removeMember.mutate(userId)}
            />
          </TabsContent>

          <TabsContent value="milestones" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Milestones" description="Delivery phases and payment milestones" />
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

          <TabsContent value="timeline" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Delivery timeline" description="Requirements through completion — with invoices, meetings, and payments" />
            <ProjectRichTimeline projectId={id!} progressPct={effectiveProgress} />
          </TabsContent>

          <TabsContent value="documents" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Documents" description="Contracts, designs, assets, and deliverables" />
            <ProjectFileManager projectId={id!} />
          </TabsContent>

          <TabsContent value="finance" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Finance" description="Revenue, expenses, profit, and cashflow" />
            <div className="space-y-4">
              <ProjectFinanceDashboard projectId={id!} fallback={financeFallback} />
              <ProjectBudgetCard project={p} summary={summary} onPatch={patch} />
              <ProjectInvoicesTab invoices={invoiceList} summary={summary} />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Analytics" description="Burndown, velocity, revenue, and milestone progress" />
            <ProjectAnalyticsPanel projectId={id!} fallback={analyticsFallback} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Activity" description="Everything that happened on this project" />
            <ProjectActivityTimeline projectId={id!} />
          </TabsContent>

          <TabsContent value="scope" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Scope management" description="Included, excluded, future scope, and extra charges" />
            <ProjectScopePanel projectId={id!} />
          </TabsContent>

          <TabsContent value="revisions" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Revision tracker" description="Every change requested by the client" />
            <ProjectRevisionsPanel projectId={id!} />
          </TabsContent>

          <TabsContent value="change-orders" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Change orders" description="Extra work, approvals, invoices, and payments" />
            <ProjectChangeOrdersPanel projectId={id!} onCreateInvoice={() => createInvoice.mutate()} />
          </TabsContent>

          <TabsContent value="approvals" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader
              title="Client approvals"
              description="Send design, frontend, and change reviews — clients approve in their portal"
            />
            <ProjectApprovalsPanel projectId={id!} />
          </TabsContent>

          <TabsContent value="resources" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Resource management" description="Team capacity, workload, and hours" />
            <ProjectResourcesPanel projectId={id!} team={allMembers} />
          </TabsContent>

          <TabsContent value="deployment" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Deployment" description="Hosting, domains, GitHub, and rollback history" />
            <ProjectDeploymentPanel projectId={id!} />
          </TabsContent>

          <TabsContent value="insights" className="mt-4 focus-visible:outline-none">
            <ProjectTabHeader title="Insights" description="Notes, team, portal, and project details" />
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-4">
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
                <ProjectTeamTab
                  members={memberList}
                  tasks={taskList}
                  available={availableMembers}
                  onAdd={(userId, role) => addMember.mutate({ userId, role })}
                  onRemove={(userId) => removeMember.mutate(userId)}
                />
              </div>
              <div className="space-y-4">
                <ProjectPortalCard summary={summary} clientId={p.client_id} fileCount={fileList.length} />
                <ProjectInfoEditor project={p} onPatch={patch} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
