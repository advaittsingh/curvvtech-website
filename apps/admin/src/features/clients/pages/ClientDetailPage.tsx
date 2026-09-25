import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PORTAL_URL } from "../constants";
import type { Client, ClientAiSummary, ClientCommunication, ClientDeletionPreview, ClientInvoice, ClientNote, ClientPayment, ClientProject, ClientSummary, ClientTimelineEvent } from "../schemas";
import { ClientCommandHeader } from "../components/ClientCommandHeader";
import { ClientKpiBar } from "../components/ClientKpiBar";
import { ClientAiSheet } from "../components/ClientAiSheet";
import { ClientDeleteDialog } from "../components/ClientDeleteDialog";
import { ClientLifecycleBanner } from "../components/ClientLifecycleBanner";
import { ClientOverviewTab } from "../components/ClientOverviewTab";
import { ClientProjectsTab } from "../components/ClientProjectsTab";
import { ClientInvoicesTab } from "../components/ClientInvoicesTab";
import { ClientNotesTab } from "../components/ClientNotesTab";
import { ClientCommunicationTab } from "../components/ClientCommunicationTab";
import { ClientPaymentsTab } from "../components/ClientPaymentsTab";
import { ClientFilesTab } from "../components/ClientFilesTab";
import { ClientTimelineTab } from "../components/ClientTimelineTab";
import { PaymentReminderSheet } from "../components/PaymentReminderSheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DetailTabTrigger, DetailTabsList } from "@/components/crm/DetailTabs";
import { QuickActionsPanel } from "@/components/crm/QuickActionsPanel";
import {
  Bell,
  FileSignature,
  FolderKanban,
  Receipt,
  StickyNote,
  Upload,
} from "lucide-react";
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
  const [reminderDraft, setReminderDraft] = useState("");
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderInvoiceId, setReminderInvoiceId] = useState<string | undefined>();
  const [markPaidLoading, setMarkPaidLoading] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePreview, setDeletePreview] = useState<ClientDeletionPreview | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [portalInviteLoading, setPortalInviteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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

  const invoiceListEarly = useMemo(
    () => (Array.isArray(invoices) ? invoices : []) as ClientInvoice[],
    [invoices],
  );

  const reminderInvoice = useMemo(() => {
    const unpaid = invoiceListEarly.filter((inv) => !["paid", "cancelled"].includes(String(inv.status ?? "")));
    if (reminderInvoiceId) {
      return unpaid.find((inv) => inv.id === reminderInvoiceId) ?? unpaid[0];
    }
    return [...unpaid].sort((a, b) => {
      const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })[0];
  }, [invoiceListEarly, reminderInvoiceId]);

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
  const invoiceList: ClientInvoice[] = invoiceListEarly;
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

  async function openPaymentReminder(invoiceId?: string) {
    setReminderInvoiceId(invoiceId);
    setReminderDraft("");
    setReminderOpen(true);
  }

  async function generateReminder() {
    setReminderLoading(true);
    try {
      const res = (await api.ai.paymentReminder({
        client_id: id,
        invoice_id: reminderInvoice?.id,
        channel: "email",
      })) as { draft?: string; message?: string };
      setReminderDraft(res.draft ?? res.message ?? "");
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setReminderLoading(false);
    }
  }

  async function sendPaymentReminder() {
    if (!id) return;
    const pending = invoiceList.filter((inv) => !["paid", "cancelled"].includes(String(inv.status ?? "")));
    if (pending.length === 0) {
      toast({
        title: "Nothing to remind",
        description: "This client has no unpaid invoices.",
        variant: "destructive",
      });
      return;
    }

    setReminderSending(true);
    try {
      const res = await api.clients.sendPaymentReminder(id, {
        invoice_id: reminderInvoice?.id ?? reminderInvoiceId,
        message: reminderDraft.trim() || undefined,
      });
      refetchComms();
      qc.invalidateQueries({ queryKey: ["admin", "clients", id, "timeline"] });
      toast({
        title: res.email_sent ? "Payment reminder sent" : "Reminder sent (email failed)",
        description: res.email_sent
          ? `${res.invoice_number} — email and portal notification delivered.`
          : `${res.invoice_number} — portal notification sent. Check email configuration.`,
        variant: res.email_sent ? "default" : "destructive",
      });
      setReminderOpen(false);
      setReminderDraft("");
      setReminderInvoiceId(undefined);
    } catch (e) {
      toast({ title: "Reminder failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setReminderSending(false);
    }
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

  async function handleResendPortalInvite() {
    if (!id) return;
    setPortalInviteLoading(true);
    try {
      const res = await api.portal.inviteClient(id, {
        email: client?.email ?? undefined,
        name: client?.name ?? undefined,
      });
      qc.invalidateQueries({ queryKey: ["admin", "clients", id] });
      qc.invalidateQueries({ queryKey: ["admin", "clients", id, "timeline"] });
      toast({
        title: res.email_sent ? "Portal invite sent" : "Invite created",
        description: res.email_sent
          ? `Email sent to ${client?.email ?? "the client"}.`
          : `Email could not be sent. Share the invite link manually if needed.`,
      });
    } catch (e) {
      toast({ title: "Invite failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPortalInviteLoading(false);
    }
  }

  async function openDeleteDialog() {
    setActionLoading("preview");
    try {
      const preview = (await api.clients.deletionPreview(id!)) as ClientDeletionPreview;
      setDeletePreview(preview);
      setDeleteOpen(true);
    } catch (e) {
      toast({ title: "Could not load client data", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  async function handleArchive() {
    setActionLoading("archive");
    try {
      await api.clients.archive(id!);
      toast({ title: "Client archived", description: "Hidden from active list. All records preserved." });
      setDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      qc.invalidateQueries({ queryKey: ["admin", "clients", id] });
      qc.invalidateQueries({ queryKey: ["admin", "clients", id, "timeline"] });
      navigate("/clients");
    } catch (e) {
      toast({ title: "Archive failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  async function handleRestore() {
    setActionLoading("restore");
    try {
      await api.clients.restore(id!);
      toast({ title: "Client restored" });
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      qc.invalidateQueries({ queryKey: ["admin", "clients", id] });
      qc.invalidateQueries({ queryKey: ["admin", "clients", id, "timeline"] });
    } catch (e) {
      toast({ title: "Restore failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  async function handleDelete() {
    setActionLoading("delete");
    try {
      await api.clients.remove(id!);
      toast({ title: "Client deleted" });
      setDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      navigate("/clients?view=deleted");
    } catch (e) {
      toast({ title: "Delete blocked", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  async function handleDuplicate() {
    setActionLoading("duplicate");
    try {
      const copy = (await api.clients.duplicate(id!)) as Client;
      toast({ title: "Client duplicated" });
      if (copy?.id) navigate(`/clients/${copy.id}`);
    } catch (e) {
      toast({ title: "Duplicate failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  async function handleExport() {
    setActionLoading("export");
    try {
      const data = await api.clients.export(id!);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${client.name ?? "client"}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded" });
    } catch (e) {
      toast({ title: "Export failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  const isArchived = Boolean(client.is_archived) && !client.deleted_at;
  const isDeleted = Boolean(client.deleted_at);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 overflow-x-hidden">
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      {(isArchived || isDeleted) && (
        <ClientLifecycleBanner
          variant={isDeleted ? "deleted" : "archived"}
          onRestore={() => void handleRestore()}
          loading={actionLoading === "restore"}
        />
      )}

      <div className="sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 space-y-4">
        <ClientCommandHeader
          client={client}
          healthScore={summaryData?.health_score ?? 0}
          summary={summaryData}
          lastInteractionAt={summaryData?.last_interaction_at}
          actionLoading={actionLoading}
          onCreateProject={handleCreateProject}
          onCreateInvoice={handleCreateInvoice}
          onPaymentReminder={() => void openPaymentReminder()}
          onOpenPortal={() => window.open(PORTAL_URL, "_blank")}
          onOpenAi={openAiSummary}
          onEdit={() => setActiveTab("overview")}
          onArchive={() => void handleArchive()}
          onDuplicate={() => void handleDuplicate()}
          onExport={() => void handleExport()}
          onDelete={() => void openDeleteDialog()}
          onRestore={() => void handleRestore()}
        />
        <ClientKpiBar summary={summaryData} />
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <DetailTabsList>
              <DetailTabTrigger value="overview">Overview</DetailTabTrigger>
              <DetailTabTrigger value="projects">Projects</DetailTabTrigger>
              <DetailTabTrigger value="invoices">Invoices</DetailTabTrigger>
              <DetailTabTrigger value="payments">Payments</DetailTabTrigger>
              <DetailTabTrigger value="notes">Notes</DetailTabTrigger>
              <DetailTabTrigger value="communications">Communication</DetailTabTrigger>
              <DetailTabTrigger value="files">Files</DetailTabTrigger>
              <DetailTabTrigger value="timeline">Timeline</DetailTabTrigger>
            </DetailTabsList>

            <TabsContent value="overview" className="mt-4">
              <ClientOverviewTab
                client={client}
                projects={projectList}
                meetingCount={meetingCount}
                members={memberList}
                timeline={timelineList}
                onPatch={(body) => updateClient.mutate(body)}
                onResendPortalInvite={() => void handleResendPortalInvite()}
                portalInviteLoading={portalInviteLoading}
              />
            </TabsContent>

            <TabsContent value="projects" className="mt-4">
              <ClientProjectsTab projects={projectList} onCreateProject={handleCreateProject} />
            </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <ClientInvoicesTab
            invoices={invoiceList}
            totalBilled={summaryData?.total_billed_cents ?? 0}
            totalReceived={summaryData?.total_received_cents ?? 0}
            outstanding={summaryData?.outstanding_cents ?? 0}
            onMarkPaid={handleMarkPaid}
            onSendReminder={(invoiceId) => void openPaymentReminder(invoiceId)}
            onCreateInvoice={handleCreateInvoice}
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
          <ClientCommunicationTab
            communications={commList}
            onConnect={() => toast({ title: "Gmail integration", description: "Coming soon — connect in Settings → Integrations." })}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <ClientFilesTab onUpload={() => navigate("/files")} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ClientTimelineTab events={timelineList} />
        </TabsContent>
          </Tabs>
        </div>

        <QuickActionsPanel
          className="hidden xl:block w-56 shrink-0 sticky top-28"
          actions={[
            { label: "Invoice", icon: Receipt, onClick: handleCreateInvoice },
            { label: "Project", icon: FolderKanban, onClick: handleCreateProject },
            { label: "Payment reminder", icon: Bell, onClick: () => void openPaymentReminder() },
            { label: "Add note", icon: StickyNote, onClick: () => setActiveTab("notes") },
            { label: "Upload file", icon: Upload, onClick: () => navigate("/files") },
            { label: "Ask AI", icon: FileSignature, onClick: openAiSummary },
          ]}
        />
      </div>

      <ClientDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        clientName={client.name ?? "Client"}
        preview={deletePreview}
        loading={actionLoading === "archive" || actionLoading === "delete"}
        onArchive={() => void handleArchive()}
        onDelete={() => void handleDelete()}
      />

      <ClientAiSheet open={aiOpen} onOpenChange={setAiOpen} clientName={client.name ?? "Client"} data={aiData} loading={aiLoading} />

      <PaymentReminderSheet
        open={reminderOpen}
        onOpenChange={(open) => {
          setReminderOpen(open);
          if (!open) {
            setReminderDraft("");
            setReminderInvoiceId(undefined);
          }
        }}
        loading={reminderLoading}
        sending={reminderSending}
        draft={reminderDraft}
        onDraftChange={setReminderDraft}
        invoiceLabel={reminderInvoice?.invoice_number || (reminderInvoice ? `INV-${reminderInvoice.id.slice(0, 6)}` : undefined)}
        invoiceAmountCents={reminderInvoice?.total_cents}
        onGenerate={generateReminder}
        onSend={() => void sendPaymentReminder()}
      />
    </div>
  );
}
