import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, ConfirmDialog, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceCommandHeader, CollectionProgressBar } from "../components/InvoiceCommandHeader";
import { InvoiceStatusBadge } from "../components/InvoiceStatusBadge";
import { InvoiceCreateDialog, type CreateInvoicePayload } from "../components/InvoiceCreateDialog";
import type { InvoiceRecord, InvoiceSummary } from "../invoice-schemas";
import { formatDueLabel, formatInr, invoiceStatus, invoiceTotal } from "../invoice-schemas";
import { useToast } from "@/hooks/use-toast";

export default function InvoicesListPage() {
  const api = useAdminApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "invoices"],
    queryFn: () => api.invoices.list() as Promise<InvoiceRecord[]>,
  });
  const { data: summary } = useQuery({
    queryKey: ["admin", "invoices", "summary"],
    queryFn: () => api.invoices.summary() as Promise<InvoiceSummary>,
  });
  const { data: clients } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: () => api.clients.list(),
  });
  const { data: projectsRaw } = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () => api.projects.list() as Promise<{ id: string; name?: string; client_id?: string; budget_cents?: number }[]>,
  });

  const list: InvoiceRecord[] = Array.isArray(data) ? data : [];
  const clientList = Array.isArray(clients) ? clients : [];
  const projects = Array.isArray(projectsRaw) ? projectsRaw : [];

  const filtered = list.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${inv.invoice_number} ${inv.client_name} ${inv.project_name}`.toLowerCase().includes(q);
  });

  const create = useMutation({
    mutationFn: (payload: CreateInvoicePayload) => api.invoices.create(payload),
    onSuccess: (inv: { id: string }) => {
      qc.invalidateQueries({ queryKey: ["admin", "invoices"] });
      setOpen(false);
      navigate(`/invoices/${inv.id}`);
    },
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => api.invoices.update(id, { status: "paid", paid_at: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "invoices"] });
      qc.invalidateQueries({ queryKey: ["admin", "invoices", "summary"] });
    },
  });

  const removeInvoice = useMutation({
    mutationFn: (id: string) => api.invoices.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "invoices"] });
      qc.invalidateQueries({ queryKey: ["admin", "invoices", "summary"] });
    },
  });

  const columns: ColumnDef<InvoiceRecord>[] = [
    {
      id: "number",
      header: "Invoice #",
      sortValue: (r) => r.invoice_number ?? r.id,
      cell: (r) => <span className="font-semibold">{r.invoice_number ?? r.id.slice(0, 8)}</span>,
    },
    {
      id: "client",
      header: "Client",
      sortValue: (r) => r.client_name ?? "",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.client_name ?? "—"}</p>
          {r.project_name && <p className="text-xs text-muted-foreground">{r.project_name}</p>}
        </div>
      ),
    },
    {
      id: "due",
      header: "Due date",
      sortValue: (r) => r.due_at ?? "",
      cell: (r) => {
        const label = formatDueLabel(r.due_at, invoiceStatus(r));
        return (
          <span className={invoiceStatus(r) === "overdue" ? "text-red-600 font-medium text-sm" : "text-sm"}>
            {r.due_at ? label : "—"}
          </span>
        );
      },
    },
    {
      id: "created",
      header: "Created",
      sortValue: (r) => r.createdAt ?? "",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.createdAt ? format(parseISO(r.createdAt), "MMM d, yyyy") : "—"}
        </span>
      ),
    },
    {
      id: "total",
      header: "Amount",
      sortValue: (r) => invoiceTotal(r),
      cell: (r) => <span className="font-semibold tabular-nums">{formatInr(invoiceTotal(r))}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (r) => invoiceStatus(r),
      cell: (r) => <InvoiceStatusBadge status={invoiceStatus(r)} />,
    },
    {
      id: "actions",
      header: "",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {invoiceStatus(r) !== "paid" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setMarkPaidId(r.id);
              }}
            >
              Mark paid
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
            aria-label={`Delete ${r.invoice_number ?? "invoice"}`}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(r);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <InvoiceCommandHeader summary={summary} onNewInvoice={() => setOpen(true)} />
      <CollectionProgressBar summary={summary} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search invoices, clients, projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <BackendErrorAlert error={error} />
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        exportable
        exportFileName="invoices.csv"
        onRowClick={(r) => navigate(`/invoices/${r.id}`)}
        emptyTitle="No invoices yet"
      />

      <InvoiceCreateDialog
        open={open}
        onOpenChange={setOpen}
        clients={clientList}
        projects={projects}
        onCreate={(p) => create.mutate(p)}
        loading={create.isPending}
      />

      <ConfirmDialog
        open={Boolean(markPaidId)}
        onOpenChange={() => setMarkPaidId(null)}
        title="Mark invoice as paid?"
        confirmLabel="Mark paid"
        onConfirm={async () => {
          if (markPaidId) await markPaid.mutateAsync(markPaidId);
          setMarkPaidId(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this invoice?"
        description={
          deleteTarget
            ? `Permanently delete invoice ${deleteTarget.invoice_number ?? deleteTarget.id.slice(0, 8)}? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete invoice"
        variant="destructive"
        loading={removeInvoice.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            const res = await removeInvoice.mutateAsync(deleteTarget.id);
            if (res && typeof res === "object" && "error" in res) {
              toast({ title: "Delete failed", description: String((res as { error?: string }).error), variant: "destructive" });
              return;
            }
            toast({ title: "Invoice deleted" });
            setDeleteTarget(null);
          } catch (e) {
            toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
          }
        }}
      />
    </div>
  );
}
