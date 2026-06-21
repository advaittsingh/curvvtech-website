import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { InvoiceCreateDialog, type CreateInvoicePayload } from "@/features/invoices/components/InvoiceCreateDialog";
import { PaymentsCommandHeader } from "../components/PaymentsCommandHeader";
import { CashflowPanel, CollectionPipelinePanel, PaymentSourcesPanel } from "../components/CollectionsPanels";
import { RevenueTrendChart } from "../components/RevenueTrendChart";
import { PaymentFeed } from "../components/PaymentFeed";
import { CollectionsSidebar } from "../components/CollectionsSidebar";
import { PaymentReminderDialog } from "../components/PaymentReminderDialog";
import type { PaymentsDashboard } from "../payments-schemas";

export default function PaymentsPage() {
  const api = useAdminApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDraft, setReminderDraft] = useState("");
  const [reminderLoading, setReminderLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "payments", "dashboard"],
    queryFn: () => api.payments.dashboard() as Promise<PaymentsDashboard>,
  });

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

  async function handleGenerateReminder() {
    const targetId = data?.ai_insight?.target_invoice_id;
    if (!targetId && !data?.ai_insight?.overdue_count) {
      toast({ title: "Nothing to remind", description: "No overdue invoices need a reminder right now." });
      return;
    }
    setReminderOpen(true);
    setReminderLoading(true);
    setReminderDraft("");
    try {
      const res = (await api.ai.paymentReminder({
        invoice_id: targetId ?? undefined,
        channel: "email",
      })) as { draft?: string; message?: string };
      setReminderDraft(res.draft ?? res.message ?? "");
    } catch (e) {
      toast({ title: "Failed to generate reminder", description: (e as Error).message, variant: "destructive" });
      setReminderOpen(false);
    } finally {
      setReminderLoading(false);
    }
  }

  const targetLabel = data?.ai_insight?.target_client_name
    ? `${data.ai_insight.target_client_name} · ${data.ai_insight.target_invoice_number ?? "invoice"}`
    : undefined;

  return (
    <div className="p-6 space-y-6">
      <PaymentsCommandHeader summary={data?.summary} onCreateInvoice={() => setCreateOpen(true)} />
      {error && <BackendErrorAlert error={error as Error} />}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          <RevenueTrendChart trend={data?.revenue_trend ?? []} />

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
          onGenerateReminder={handleGenerateReminder}
          reminderLoading={reminderLoading}
        />
      </div>

      <InvoiceCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clientList}
        projects={projects}
        loading={create.isPending}
        onCreate={(payload) => create.mutate(payload)}
      />

      <PaymentReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        draft={reminderDraft}
        onDraftChange={setReminderDraft}
        loading={reminderLoading}
        targetLabel={targetLabel}
      />
    </div>
  );
}
