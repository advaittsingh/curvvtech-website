import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PORTAL_URL } from "../constants";
import type { Client, ClientAiSummary, ClientCommunication, ClientInvoice, ClientNote, ClientPayment, ClientProject, ClientSummary, ClientTimelineEvent } from "../schemas";
import { ClientCommandHeader } from "../components/ClientCommandHeader";
import { ClientKpiBar } from "../components/ClientKpiBar";
import { ClientAiSheet } from "../components/ClientAiSheet";
import { ClientOverviewTab } from "../components/ClientOverviewTab";
import { ClientProjectsTab } from "../components/ClientProjectsTab";
import { ClientInvoicesTab } from "../components/ClientInvoicesTab";
import { ClientNotesTab } from "../components/ClientNotesTab";
import { ClientCommunicationTab } from "../components/ClientCommunicationTab";
import { ClientPaymentsTab } from "../components/ClientPaymentsTab";
import { ClientFilesTab } from "../components/ClientFilesTab";
import { ClientTimelineTab } from "../components/ClientTimelineTab";
import { PaymentReminderSheet } from "../components/PaymentReminderSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [aiOpen, setAiOpen] = useState(false);
  const [aiData, setAiData] = useState<ClientAiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderChannel, setReminderChannel] = useState("email");
  const [reminderDraft, setReminderDraft] = useState("");
  const [reminderLoading, setReminderLoading] = useState(false);
  const [markPaidLoading, setMarkPaidLoading] = useState("");

  const { data: client, isLoading } = useQuery({
    queryKey: ["admin", "clients", id],
    queryFn: () => api.clients.get(id!) as Promise<Client>,
    enabled: Boolean(id),
  });

  const { data: summary } = useQuery({
    queryKey: ["admin", "clients", id, "summary"],
    queryFn: () => api.clients.summary(id!) as Promise<ClientSummary>,
    enabled: Boolean(id),
  });

  const { data: projects } = useQuery({
    queryKey: ["admin", "clients", id, "projects"],
    queryFn: () => api.clients.projects(id!),
    enabled: Boolean(id),
  });

  const { data: invoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["admin", "clients", id, "invoices"],
    queryFn: () => api.clients.invoices(id!),
    enabled: Boolean(id),
  });

  const { data: payments } = useQuery({
    queryKey: ["admin", "clients", id, "payments"],
    queryFn: () => api.clients.payments(id!),
    enabled: Boolean(id),
  });

  const { data: notes, refetch: refetchNotes } = useQuery({
    queryKey: ["admin", "clients", id, "notes"],
    queryFn: () => api.clients.notes(id!),
    enabled: Boolean(id),
  });

  const { data: communications, refetch: refetchComms } = useQuery({
    queryKey: ["admin", "clients", id, "communications"],
    queryFn: () => api.clients.communications(id!),
    enabled: Boolean(id),
  });

  const { data: timeline } = useQuery({
    queryKey: ["admin", "clients", id, "timeline"],
    queryFn: () => api.clients.timeline(id!),
    enabled: Boolean(id),
  });

  const { data: members } = useQuery({
    queryKey: ["admin", "team", "members"],
    queryFn: () => api.team.members(),
  });

  const updateClient = useMutation({
    mutationFn: (body: object) => api.clients.update(id!, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "clients", id] }),
  });

  const memberList = useMemo(
    () => (Array.isArray(members) ? members : []) as { user_id: string; email: string }[],
    [members],
  );

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!client || (typeof client === "object" && "error" in client)) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Client not found.</p>
        <Link to="/clients" className="text-sm underline mt-2 inline-block">Back to clients</Link>
      </div>
    );
  }

  const projectList: ClientProject[] = Array.isArray(projects) ? projects : [];
  const invoiceList: ClientInvoice[] = Array.isArray(invoices) ? invoices : [];
  const paymentList: ClientPayment[] = Array.isArray(payments) ? payments : [];
  const noteList: ClientNote[] = Array.isArray(notes) ? notes : [];
  const commList: ClientCommunication[] = Array.isArray(communications) ? communications : [];
  const timelineList: ClientTimelineEvent[] = Array.isArray(timeline) ? timeline : [];
  const summaryData = summary && typeof summary === "object" && !("error" in summary) ? (summary as ClientSummary) : null;

  const meetingCount = commList.filter((c) => c.channel === "meeting" || c.channel === "phone").length;

  function refreshFinancials() {
    qc.invalidateQueries({ queryKey: ["admin", "clients", id, "summary"] });
    refetchInvoices();
    qc.invalidateQueries({ queryKey: ["admin", "clients", id, "payments"] });
  }

  async function openAiSummary() {
    setAiOpen(true);
    setAiLoading(true);
    try {
      const res = (await api.ai.clientSummary({ client_id: id })) as ClientAiSummary;
      setAiData(res);
    } catch (e) {
      toast({ title: "Summary failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  async function generateReminder() {
    setReminderLoading(true);
    try {
      const res = (await api.ai.paymentReminder({ client_id: id, channel: reminderChannel })) as { draft?: string; message?: string };
      setReminderDraft(res.draft ?? res.message ?? "");
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setReminderLoading(false);
    }
  }

  async function logReminderCommunication() {
    if (!reminderDraft.trim()) return;
    await api.clients.addCommunication(id!, {
      channel: reminderChannel === "whatsapp" ? "whatsapp" : reminderChannel === "sms" ? "phone" : "reminder",
      subject: "Payment reminder",
      body: reminderDraft,
    });
    refetchComms();
    toast({ title: "Logged to communication feed" });
    setReminderOpen(false);
  }

  async function handleMarkPaid(invoiceId: string) {
    setMarkPaidLoading(invoiceId);
    try {
      await api.invoices.update(invoiceId, { status: "paid", paid_at: new Date().toISOString() });
      toast({ title: "Invoice marked paid" });
      refreshFinancials();
      qc.invalidateQueries({ queryKey: ["admin", "clients", id, "timeline"] });
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setMarkPaidLoading("");
    }
  }

  async function handleCreateInvoice() {
    try {
      const inv = (await api.invoices.create({ client_id: id, status: "draft" })) as { id: string };
      navigate(`/invoices/${inv.id}`);
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  function handleCreateProject() {
    navigate(`/projects?client_id=${id}`);
  }

  function handleResendPortalInvite() {
    updateClient.mutate({ portal_status: "invited" });
    toast({ title: "Portal invite marked as sent", description: "Full portal onboarding coming soon." });
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 overflow-x-hidden">
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      <ClientCommandHeader
        client={client}
        healthScore={summaryData?.health_score ?? 0}
        lastInteractionAt={summaryData?.last_interaction_at}
        onCreateProject={handleCreateProject}
        onCreateInvoice={handleCreateInvoice}
        onPaymentReminder={() => setReminderOpen(true)}
        onOpenPortal={() => window.open(PORTAL_URL, "_blank")}
        onOpenAi={openAiSummary}
      />

      <ClientKpiBar summary={summaryData} />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="communications">Communication</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ClientOverviewTab
            client={client}
            projects={projectList}
            meetingCount={meetingCount}
            members={memberList}
            onPatch={(body) => updateClient.mutate(body)}
            onResendPortalInvite={handleResendPortalInvite}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <ClientProjectsTab projects={projectList} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <ClientInvoicesTab
            invoices={invoiceList}
            totalBilled={summaryData?.total_billed_cents ?? 0}
            totalReceived={summaryData?.total_received_cents ?? 0}
            outstanding={summaryData?.outstanding_cents ?? 0}
            onMarkPaid={handleMarkPaid}
            onSendReminder={() => setReminderOpen(true)}
            markPaidLoading={markPaidLoading}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <ClientPaymentsTab payments={paymentList} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <ClientNotesTab
            notes={noteList}
            onAddNote={async (body) => {
              await api.clients.addNote(id!, { body });
              refetchNotes();
            }}
          />
        </TabsContent>

        <TabsContent value="communications" className="mt-4">
          <ClientCommunicationTab communications={commList} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <ClientFilesTab />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ClientTimelineTab events={timelineList} />
        </TabsContent>
      </Tabs>

      <ClientAiSheet open={aiOpen} onOpenChange={setAiOpen} clientName={client.name ?? "Client"} data={aiData} loading={aiLoading} />

      <PaymentReminderSheet
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        loading={reminderLoading}
        draft={reminderDraft}
        onDraftChange={setReminderDraft}
        channel={reminderChannel}
        onChannelChange={setReminderChannel}
        onGenerate={generateReminder}
        onLogCommunication={logReminderCommunication}
      />
    </div>
  );
}
