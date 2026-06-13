import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";

type Payment = { id: string; invoice_number?: string; client_name?: string; total_cents?: number; status?: string; paid_at?: string };

export default function PaymentsPage() {
  const api = useAdminApi();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "invoices", "paid"], queryFn: () => api.invoices.list("paid") });
  const list: Payment[] = Array.isArray(data) ? data : [];

  const columns: ColumnDef<Payment>[] = [
    { id: "inv", header: "Invoice", sortValue: (r) => r.invoice_number ?? r.id, cell: (r) => r.invoice_number ?? r.id.slice(0, 8) },
    { id: "client", header: "Client", sortValue: (r) => r.client_name ?? "", cell: (r) => r.client_name ?? "—" },
    { id: "amount", header: "Amount", sortValue: (r) => r.total_cents ?? 0, cell: (r) => `₹${(r.total_cents ?? 0) / 100}` },
    { id: "status", header: "Status", cell: (r) => r.status ?? "paid" },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Payments" description="Payment history and transaction log." />
      <DataTable columns={columns} data={list} isLoading={isLoading} emptyTitle="No payments recorded" />
    </div>
  );
}
