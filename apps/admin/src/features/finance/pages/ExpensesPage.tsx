import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { ExpensesCommandHeader } from "../components/ExpensesCommandHeader";
import { ExpenseBreakdownChart, ExpenseCategoryCards } from "../components/ExpenseBreakdownChart";
import { ExpenseIntelligencePanel } from "../components/ExpenseIntelligencePanel";
import { ExpenseTimeline, ProjectProfitabilityPanel } from "../components/ExpenseTimeline";
import { ExpenseCreateDialog } from "../components/ExpenseCreateDialog";
import type { ExpenseRecord, ExpensesDashboard, ReceiptScanResult } from "../expense-schemas";

const EMPTY_FORM = {
  category: "software",
  description: "",
  amount: "",
  vendor: "",
  expense_date: new Date().toISOString().slice(0, 10),
  project_id: "",
};

export default function ExpensesPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "expenses", "dashboard"],
    queryFn: () => api.expenses.dashboard() as Promise<ExpensesDashboard>,
  });

  const { data: projectsRaw } = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () => api.projects.list() as Promise<{ id: string; name?: string }[]>,
  });
  const projects = Array.isArray(projectsRaw) ? projectsRaw : [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "expenses"] });
  };

  const create = useMutation({
    mutationFn: () =>
      api.expenses.create({
        category: form.category,
        description: form.description,
        amount_cents: Math.round(Number(form.amount || 0) * 100),
        vendor: form.vendor || null,
        expense_date: form.expense_date,
        project_id: form.project_id || null,
        status: "approved",
      }),
    onSuccess: () => {
      invalidate();
      closeDialog();
      toast({ title: "Expense added" });
    },
  });

  const update = useMutation({
    mutationFn: () =>
      api.expenses.update(editId!, {
        category: form.category,
        description: form.description,
        amount_cents: Math.round(Number(form.amount || 0) * 100),
        vendor: form.vendor || null,
        expense_date: form.expense_date,
        project_id: form.project_id || null,
      }),
    onSuccess: () => {
      invalidate();
      closeDialog();
      toast({ title: "Expense updated" });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.expenses.remove(id),
    onSuccess: invalidate,
  });

  const scanReceipt = useMutation({
    mutationFn: (imageBase64: string) => api.ai.scanReceipt({ image_base64: imageBase64 }) as Promise<ReceiptScanResult>,
    onSuccess: (res) => {
      setForm((f) => ({
        ...f,
        description: res.description || f.description,
        vendor: res.vendor ?? f.vendor,
        amount: res.amount_cents ? String(res.amount_cents / 100) : f.amount,
        category: res.category || f.category,
        expense_date: res.expense_date || f.expense_date,
      }));
      toast({ title: "Receipt scanned", description: "Fields auto-filled — review and save." });
    },
    onError: (e) => {
      toast({ title: "Scan failed", description: (e as Error).message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setOpen(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM, expense_date: new Date().toISOString().slice(0, 10) });
  }

  function startAdd() {
    setForm({ ...EMPTY_FORM, expense_date: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setOpen(true);
  }

  function startEdit(e: ExpenseRecord) {
    setEditId(e.id);
    setForm({
      category: e.category,
      description: e.description,
      amount: String(e.amount_cents / 100),
      vendor: e.vendor ?? "",
      expense_date: e.expense_date,
      project_id: e.project_id ?? "",
    });
    setOpen(true);
  }

  const dialogOpen = open || Boolean(editId);

  return (
    <div className="p-6 space-y-6">
      <ExpensesCommandHeader summary={data?.summary} onAddExpense={startAdd} />
      {error && <BackendErrorAlert error={error as Error} />}

      <ExpenseCategoryCards categories={data?.categories ?? []} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6 min-w-0">
          <ExpenseBreakdownChart categories={data?.categories ?? []} />
          <ExpenseTimeline
            expenses={data?.recent_expenses ?? []}
            isLoading={isLoading}
            onAddExpense={startAdd}
            onEdit={startEdit}
            onDelete={setDeleteId}
          />
          <ProjectProfitabilityPanel projects={data?.project_profitability ?? []} />
        </div>

        <ExpenseIntelligencePanel insight={data?.ai_insight} burn={data?.burn} />
      </div>

      <ExpenseCreateDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) closeDialog();
        }}
        projects={projects}
        loading={create.isPending || update.isPending}
        scanLoading={scanReceipt.isPending}
        editId={editId}
        form={form}
        onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onSubmit={() => (editId ? update.mutate() : create.mutate())}
        onScanReceipt={(img) => scanReceipt.mutate(img)}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={() => setDeleteId(null)}
        title="Delete expense?"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteId) await remove.mutateAsync(deleteId);
          setDeleteId(null);
          toast({ title: "Expense deleted" });
        }}
      />
    </div>
  );
}
