import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { InvoiceCreateDialog, type CreateInvoicePayload } from "@/features/invoices/components/InvoiceCreateDialog";
import type { InvoiceRecord, InvoiceSummary } from "@/features/invoices/invoice-schemas";
import { PaymentsCommandHeader } from "../components/PaymentsCommandHeader";
import { CashflowPanel, CollectionPipelinePanel, PaymentSourcesPanel } from "../components/CollectionsPanels";
import { RevenueTrendChart } from "../components/RevenueTrendChart";
import { PaymentFeed } from "../components/PaymentFeed";
import { CollectionsSidebar } from "../components/CollectionsSidebar";
import { PaymentReminderDialog } from "../components/PaymentReminderDialog";
import { buildPaymentsDashboardFallback } from "../payments-fallback";
import type { PaymentsDashboard } from "../payments-schemas";

async function loadPaymentsDashboard(api: ReturnType<typeof useAdminApi>): Promise<{
  data: PaymentsDashboard;
  usedFallback: boolean;
}> {
  try {
    const res = (await api.payments.dashboard()) as PaymentsDashboard & { error?: string };
    if (res?.summary && !res.error) {
      return { data: res, usedFallback: false };
    }
  } catch {
    // fall through to invoice-based fallback
  }

  const [summary, invoices] = await Promise.all([
    api.invoices.summary() as Promise<InvoiceSummary>,
    api.invoices.list() as Promise<InvoiceRecord[]>,
  ]);
  return {
    data: buildPaymentsDashboardFallback(summary, Array.isArray(invoices) ? invoices : []),
    usedFallback: true,
  };
}

export default function PaymentsPage() {
  const api = useAdminApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDraft, setReminderDraft] = useState("");
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);

  const { data: payload, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "payments", "dashboard"],
    queryFn: () => loadPaymentsDashboard(api),
    staleTime: 30_000,
  });

  const data = payload?.data;
  const usedFallback = payload?.usedFallback ?? false;

  const { data: clients } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: () => api.clients.list(),
  });
  const { data: projectsRaw } = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () => api.projects.list() as Promise<{ id: string; name?: string; client_id?: string; budget_cents?: number }[]>,
  });

  const clientList = Array.isArray(clients) ? clients : [];
  const projects = Array.isArray(projectsRaw) ? projectsRaw : [];

  const create = useMutation({
    mutationFn: (payload: CreateInvoicePayload) => api.invoices.create(payload),
    onSuccess: (inv: { id: string }) => {
      qc.invalidateQueries({ queryKey: ["admin", "payments"] });
      qc.invalidateQueries({ queryKey: ["admin", "invoices"] });
      setCreateOpen(false);
      navigate(`/invoices/${inv.id}`);
    },
  });

  async function openReminderDialog() {
    const targetId = data?.ai_insight?.target_invoice_id;
    if (!targetId && !data?.ai_insight?.overdue_count) {
      toast({ title: "Nothing to remind", description: "No overdue invoices need a reminder right now." });
      return;
    }
    setReminderDraft("");
    setReminderOpen(true);
  }

  async function generateReminderDraft() {
    const targetId = data?.ai_insight?.target_invoice_id;
    setReminderLoading(true);
    try {
      const res = (await api.ai.paymentReminder({
        invoice_id: targetId ?? undefined,
        channel: "email",
      })) as { draft?: string; message?: string };
      setReminderDraft(res.draft ?? res.message ?? "");
    } catch (e) {
      toast({ title: "Failed to generate reminder", description: (e as Error).message, variant: "destructive" });
    } finally {
      setReminderLoading(false);
    }
  }

  async function sendReminder() {
    const targetId = data?.ai_insight?.target_invoice_id;
    if (!targetId) {
      toast({ title: "Nothing to remind", description: "No target invoice selected.", variant: "destructive" });
      return;
    }
    setReminderSending(true);
    try {
      const res = await api.invoices.sendPaymentReminder(targetId, {
        message: reminderDraft.trim() || undefined,
      });
      toast({
        title: res.email_sent ? "Payment reminder sent" : "Reminder sent (email failed)",
        description: res.email_sent
          ? `${res.invoice_number} — email and portal notification delivered.`
          : `${res.invoice_number} — portal notification sent.`,
        variant: res.email_sent ? "default" : "destructive",
      });
      setReminderOpen(false);
      setReminderDraft("");
    } catch (e) {
      toast({ title: "Reminder failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setReminderSending(false);
    }
  }

  const targetLabel = data?.ai_insight?.target_client_name
    ? `${data.ai_insight.target_client_name} · ${data.ai_insight.target_invoice_number ?? "invoice"}`
    : undefined;

  const showError = error && !data;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PaymentsCommandHeader
        summary={data?.summary}
        onCreateInvoice={() => setCreateOpen(true)}
        isLoading={isLoading}
      />

      {showError && <BackendErrorAlert error={error as Error} />}

      {usedFallback && data && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <span>Showing collections from invoice records. Live dashboard sync will resume after the API update.</span>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>
      )}

      {!showError && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6 min-w-0">
            <RevenueTrendChart trend={data?.revenue_trend ?? []} isLoading={isLoading} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CashflowPanel cashflow={data?.cashflow} />
              <CollectionPipelinePanel pipeline={data?.pipeline} />
            </div>

            <PaymentFeed
              payments={data?.recent_payments ?? []}
              isLoading={isLoading}
              onCreateInvoice={() => setCreateOpen(true)}
            />

            <PaymentSourcesPanel sources={data?.sources ?? []} />
          </div>

          <CollectionsSidebar
            insight={data?.ai_insight}
            upcoming={data?.upcoming ?? []}
            onGenerateReminder={openReminderDialog}
            reminderLoading={reminderSending}
            isLoading={isLoading}
          />
        </div>
      )}

      <InvoiceCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clientList}
        projects={projects}
        loading={create.isPending}
        onCreate={(p) => create.mutate(p)}
      />

      <PaymentReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        draft={reminderDraft}
        onDraftChange={setReminderDraft}
        loading={reminderLoading}
        sending={reminderSending}
        targetLabel={targetLabel}
        onGenerate={generateReminderDraft}
        onSend={() => void sendReminder()}
      />
    </div>
  );
}
