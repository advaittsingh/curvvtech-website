import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import type { Client, ClientListView } from "../schemas";
import { CLIENT_LIST_VIEW_LABELS, CLIENT_LIST_VIEWS, CLIENT_STATUS_COLORS, CLIENT_STATUS_LABELS } from "../constants";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function formatCents(cents?: number) {
  if (!cents) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function lifecycleLabel(client: Client): { label: string; className?: string } {
  if (client.deleted_at) return { label: "Deleted", className: "bg-red-100 text-red-800 border-red-200" };
  if (client.is_archived) return { label: "Archived", className: "bg-amber-100 text-amber-800 border-amber-200" };
  const st = String(client.status ?? "active");
  return {
    label: CLIENT_STATUS_LABELS[st] ?? st,
    className: CLIENT_STATUS_COLORS[st],
  };
}

const columns: ColumnDef<Client>[] = [
  { id: "name", header: "Name", sortValue: (r) => r.name ?? "", cell: (r) => <span className="font-medium">{r.name ?? "—"}</span> },
  { id: "company", header: "Company", sortValue: (r) => r.company ?? "", cell: (r) => r.company ?? "—" },
  { id: "email", header: "Email", sortValue: (r) => r.email ?? "", cell: (r) => r.email ?? "—" },
  { id: "value", header: "Contract value", sortValue: (r) => r.contract_value_cents ?? 0, cell: (r) => formatCents(r.contract_value_cents ?? undefined) },
  {
    id: "status",
    header: "Status",
    sortValue: (r) => (r.deleted_at ? "deleted" : r.is_archived ? "archived" : r.status ?? ""),
    cell: (r) => {
      const { label, className } = lifecycleLabel(r);
      return (
        <Badge variant="outline" className={cn("capitalize", className)}>
          {label}
        </Badge>
      );
    },
  },
];

export default function ClientsListPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [view, setView] = useState<ClientListView>("active");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "clients", view],
    queryFn: () => api.clients.list(view),
  });

  const create = useMutation({
    mutationFn: () => api.clients.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      setOpen(false);
      setForm({ name: "", email: "", company: "" });
    },
  });

  const list: Client[] = Array.isArray(data) ? data : [];

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Clients"
        description="Client relationships, revenue, and delivery history."
        action={
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add client
          </Button>
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as ClientListView)}>
        <TabsList>
          {CLIENT_LIST_VIEWS.map((v) => (
            <TabsTrigger key={v} value={v}>
              {CLIENT_LIST_VIEW_LABELS[v]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <BackendErrorAlert error={error} />
      <DataTable
        columns={columns}
        data={list}
        isLoading={isLoading}
        exportable
        exportFileName={`clients-${view}.csv`}
        onRowClick={(r) => navigate(`/clients/${r.id}`)}
        emptyTitle={view === "active" ? "No active clients" : `No ${CLIENT_LIST_VIEW_LABELS[view].toLowerCase()} clients`}
        emptyDescription={
          view === "archived"
            ? "Archived clients are hidden from the default list but can be restored anytime."
            : view === "deleted"
              ? "Soft-deleted clients appear here and can be restored."
              : undefined
        }
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <Button className="w-full" onClick={() => create.mutate()} disabled={!form.name || create.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
