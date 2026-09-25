import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useLeadMutations } from "../hooks/useLeads";
import type { Lead, LeadAiInsights } from "../schemas";
import { LeadDealHeader } from "../components/LeadDealHeader";
import { LeadDealHealthCard } from "../components/LeadDealHealthCard";
import { LeadBreadcrumbs } from "../components/LeadBreadcrumbs";
import { LeadWonBanner } from "../components/LeadWonBanner";
import { LeadAiSheet } from "../components/LeadAiSheet";
import { LeadOverviewTab } from "../components/LeadOverviewTab";
import { LeadTimelineTab } from "../components/LeadTimelineTab";
import { LeadActivityTab } from "../components/LeadActivityTab";
import { LeadNotesTab } from "../components/LeadNotesTab";
import { LeadCommunicationTab } from "../components/LeadCommunicationTab";
import { LeadFilesTab } from "../components/LeadFilesTab";
import type { NoteCategory } from "../constants";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DetailTabTrigger, DetailTabsList } from "@/components/crm/DetailTabs";
import { PipelineProgress } from "@/components/crm/PipelineProgress";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "../constants";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/system";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { update, remove } = useLeadMutations();
  const [emailDraft, setEmailDraft] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState("");
  const [tab, setTab] = useState("overview");
  const [aiOpen, setAiOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["admin", "leads", id],
    queryFn: () => api.leads.get(id!) as Promise<Lead>,
    enabled: Boolean(id),
  });

  const { data: notes, refetch: refetchNotes } = useQuery({
    queryKey: ["admin", "leads", id, "notes"],
    queryFn: () => api.leads.notes(id!),
    enabled: Boolean(id),
  });

  const { data: timeline, refetch: refetchTimeline } = useQuery({
    queryKey: ["admin", "leads", id, "timeline"],
    queryFn: () => api.leads.timeline(id!),
    enabled: Boolean(id),
  });

  const { data: activity, refetch: refetchActivity } = useQuery({
    queryKey: ["admin", "leads", id, "activity"],
    queryFn: () => api.leads.activity(id!),
    enabled: Boolean(id),
  });

  const { data: aiInsights, refetch: refetchInsights } = useQuery({
    queryKey: ["admin", "leads", id, "ai-insights"],
    queryFn: () => api.leads.aiInsights(id!) as Promise<LeadAiInsights>,
    enabled: Boolean(id),
  });

  const { data: members } = useQuery({
    queryKey: ["admin", "team", "members"],
    queryFn: () => api.team.members(),
  });

  const memberList = useMemo(
    () => (Array.isArray(members) ? members : []) as { user_id: string; email: string }[],
    [members],
  );

  const memberMap = useMemo(
    () => new Map(memberList.map((m) => [m.user_id, m.email])),
    [memberList],
  );

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!lead || (typeof lead === "object" && "error" in lead)) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Lead not found.</p>
        <LeadBreadcrumbs leadName="Not found" />
      </div>
    );
  }

  const noteList = Array.isArray(notes) ? notes : [];
  const timelineList = Array.isArray(timeline) ? timeline : [];
  const activityList = Array.isArray(activity) ? activity : [];
  const score = lead.score ?? aiInsights?.score ?? 0;
  const leadId = lead.id;
  const currentStatus = lead.status ?? "new";

  const ownerEmail = lead.assigned_to_clerk_id
    ? memberMap.get(lead.assigned_to_clerk_id) ?? null
    : null;

  function patch(body: object) {
    update.mutate({ id: leadId, body });
  }

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ["admin", "leads", id] });
    refetchTimeline();
    refetchActivity();
    refetchInsights();
  }

  async function runAi(key: string, fn: () => Promise<void>) {
    setAiLoading(key);
    try {
      await fn();
    } catch (e) {
      toast({ title: "AI failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAiLoading("");
    }
  }

  async function handleGenerateProposal() {
    setActionLoading("proposal");
    try {
      const res = (await api.leads.generateProposal(leadId)) as { proposal_id: string; existing?: boolean };
      toast({
        title: res.existing ? "Proposal already exists" : "Proposal created",
        description: "Lead data carried over automatically.",
      });
      refreshAll();
      navigate(`/proposals/${res.proposal_id}`);
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  async function handleCreateClient() {
    setActionLoading("client");
    try {
      const res = (await api.leads.convertToClient(leadId)) as {
        client_id: string;
        project_id?: string | null;
        already?: boolean;
      };
      toast({
        title: res.already ? "Client already exists" : "Client created",
        description: "Project linked from lead details.",
      });
      refreshAll();
      qc.invalidateQueries({ queryKey: ["admin", "leads", id] });
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  function handleCreateProject() {
    if (lead.converted_project_id) {
      navigate(`/projects/${lead.converted_project_id}`);
      return;
    }
    if (lead.converted_client_id) {
      navigate(`/clients/${lead.converted_client_id}`);
      return;
    }
    toast({ title: "Create client first", description: "Convert this lead to a client to create a project." });
  }

  async function handleGenerateInvoice() {
    if (!lead.converted_client_id) return;
    setActionLoading("invoice");
    try {
      const invoice = (await api.invoices.create({
        client_id: lead.converted_client_id,
        project_id: lead.converted_project_id ?? undefined,
        status: "draft",
      })) as { id: string };
      toast({ title: "Draft invoice created" });
      navigate(`/invoices/${invoice.id}`);
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  function handleScheduleCall() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const nextStatus = currentStatus === "new" ? "discovery_call" : currentStatus;
    patch({ next_follow_up_at: tomorrow.toISOString(), status: nextStatus });
    setTab("communication");
    toast({ title: "Call scheduled", description: "Follow-up set for tomorrow 10:00 AM." });
  }

  async function handleAddNote(body: string, _category: NoteCategory) {
    await api.leads.addNote(leadId, { body, is_internal: true });
    refetchNotes();
    refetchTimeline();
    refetchActivity();
  }

  async function handleDeleteLead() {
    setActionLoading("delete");
    try {
      const res = await remove.mutateAsync(leadId);
      if (res && typeof res === "object" && "error" in res) {
        toast({ title: "Delete failed", description: String((res as { error?: string }).error), variant: "destructive" });
        return;
      }
      toast({ title: "Lead deleted" });
      navigate("/leads");
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
      setDeleteOpen(false);
    }
  }

  const aiActions = {
    emailDraft: async () => {
      const res = await api.ai.emailDraft({ lead_id: leadId, purpose: "Follow up on enquiry" });
      setEmailDraft(res.draft ?? "");
      setAiOpen(false);
      setTab("communication");
      toast({ title: "Follow-up draft ready" });
    },
    summarize: async () => {
      const res = await api.ai.summarizeLead({ lead_id: leadId });
      setAiOutput(res.summary ?? "");
    },
    closeProbability: async () => {
      const res = await api.ai.closeProbability({ lead_id: leadId });
      setAiOutput(res.analysis ?? "");
      await api.leads.recalculateScore(leadId);
      refreshAll();
    },
    meetingQuestions: async () => {
      const res = await api.ai.meetingQuestions({ lead_id: leadId });
      setAiOutput(res.questions ?? "");
    },
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto overflow-x-hidden space-y-6">
      <LeadBreadcrumbs leadName={lead.name ?? lead.company ?? "Lead"} />

      {lead.status === "won" && (
        <LeadWonBanner
          onCreateClient={handleCreateClient}
          onCreateProject={handleCreateProject}
          onGenerateInvoice={handleGenerateInvoice}
          hasClient={Boolean(lead.converted_client_id)}
          hasProject={Boolean(lead.converted_project_id)}
          loading={actionLoading}
        />
      )}

      <div className="sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 space-y-4">
        <LeadDealHeader
          lead={lead}
          score={score}
          ownerEmail={ownerEmail}
          aiInsights={aiInsights}
          actionLoading={actionLoading}
          onGenerateProposal={handleGenerateProposal}
          onCreateClient={handleCreateClient}
          onCreateProject={handleCreateProject}
          onScheduleCall={handleScheduleCall}
          onOpenAi={() => setAiOpen(true)}
          onDelete={() => setDeleteOpen(true)}
        />

        <LeadDealHealthCard
          lead={lead}
          score={score}
          aiInsights={aiInsights}
          onOpenAi={() => setAiOpen(true)}
          onRecommendedAction={() => {
            const action = aiInsights?.recommended_actions?.[0]?.kind;
            if (action === "generate_proposal") void handleGenerateProposal();
            else if (action === "schedule_call") handleScheduleCall();
            else if (action === "follow_up") {
              setAiOpen(true);
              void runAi("email", aiActions.emailDraft);
            } else void handleGenerateProposal();
          }}
        />
      </div>

      <PipelineProgress
        stages={LEAD_STATUSES.filter((s) => s !== "lost").map((s) => ({
          id: s,
          label: LEAD_STATUS_LABELS[s].replace(" Call", "").replace(" Sent", ""),
        }))}
        currentId={currentStatus}
        onStageChange={(status) => {
          patch({ status });
          refreshAll();
        }}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <DetailTabsList>
          <DetailTabTrigger value="overview">Overview</DetailTabTrigger>
          <DetailTabTrigger value="timeline">Timeline</DetailTabTrigger>
          <DetailTabTrigger value="activity">Activity</DetailTabTrigger>
          <DetailTabTrigger value="notes">Notes</DetailTabTrigger>
          <DetailTabTrigger value="communication">Communication</DetailTabTrigger>
          <DetailTabTrigger value="files">Files</DetailTabTrigger>
        </DetailTabsList>

        <TabsContent value="overview" className="mt-4">
          <LeadOverviewTab lead={lead} score={score} members={memberList} onPatch={patch} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <LeadTimelineTab events={timelineList} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <LeadActivityTab events={activityList} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <LeadNotesTab
            notes={noteList}
            requirements={lead.requirements ?? lead.message}
            memberMap={memberMap}
            onAddNote={handleAddNote}
          />
        </TabsContent>

        <TabsContent value="communication" className="mt-4">
          <LeadCommunicationTab
            lead={lead}
            emailDraft={emailDraft}
            onEmailDraftChange={setEmailDraft}
            onDraftEmail={() => setAiOpen(true)}
            onScheduleCall={handleScheduleCall}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <LeadFilesTab lead={lead} />
        </TabsContent>
      </Tabs>

      <LeadAiSheet
        open={aiOpen}
        onOpenChange={setAiOpen}
        lead={lead}
        score={score}
        aiInsights={aiInsights}
        aiOutput={aiOutput}
        aiLoading={aiLoading}
        actionLoading={actionLoading}
        onGenerateProposal={handleGenerateProposal}
        onAiAction={runAi}
        actions={aiActions}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this lead?"
        description={`Permanently delete ${lead.company ?? lead.name ?? "this lead"}? Notes and call history will be removed. Linked clients and projects are kept.`}
        confirmLabel="Delete lead"
        variant="destructive"
        loading={actionLoading === "delete" || remove.isPending}
        onConfirm={() => void handleDeleteLead()}
      />
    </div>
  );
}
