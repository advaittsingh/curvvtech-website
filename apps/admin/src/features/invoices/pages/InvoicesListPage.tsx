import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, ConfirmDialog, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type Invoice = {
  id: string;
  invoice_number?: string;
  client_name?: string;
  status?: string;
  total_cents?: number;
  due_at?: string;
};

const statusVariant: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700",
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
};

function formatCents(c?: number) {
  if (!c) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);
}

export default function InvoicesListPage() {
  const api = useAdminApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "invoices"], queryFn: () => api.invoices.list() });
  const list: Invoice[] = Array.isArray(data) ? data : [];

  const markPaid = useMutation({
    mutationFn: (id: string) => api.invoices.update(id, { status: "paid" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "invoices"] }),
  });

  const columns: ColumnDef<Invoice>[] = [
    { id: "number", header: "Invoice", sortValue: (r) => r.invoice_number ?? r.id, cell: (r) => r.invoice_number ?? r.id.slice(0, 8) },
    { id: "client", header: "Client", sortValue: (r) => r.client_name ?? "", cell: (r) => r.client_name ?? "—" },
    { id: "total", header: "Amount", sortValue: (r) => r.total_cents ?? 0, cell: (r) => formatCents(r.total_cents) },
    {
      id: "status",
      header: "Status",
      sortValue: (r) => r.status ?? "",
      cell: (r) => <Badge className={statusVariant[String(r.status)] ?? ""}>{r.status ?? "draft"}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: (r) =>
        r.status !== "paid" ? (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setMarkPaidId(r.id); }}>
            Mark paid
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Invoices" description="Create, send, and track billing." action={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New invoice</Button>} />
      <BackendErrorAlert error={error} />
      <DataTable columns={columns} data={list} isLoading={isLoading} exportable exportFileName="invoices.csv" onRowClick={(r) => navigate(`/invoices/${r.id}`)} emptyTitle="No invoices" />
      <ConfirmDialog
        open={Boolean(markPaidId)}
        onOpenChange={() => setMarkPaidId(null)}
        title="Mark invoice as paid?"
        confirmLabel="Mark paid"
        onConfirm={async () => { if (markPaidId) await markPaid.mutateAsync(markPaidId); setMarkPaidId(null); }}
      />
    </div>
  );
}
