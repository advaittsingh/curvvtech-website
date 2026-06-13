import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Client = {
  id: string;
  name?: string;
  company?: string;
  email?: string;
  contract_value_cents?: number;
  status?: string;
};

function formatCents(cents?: number) {
  if (!cents) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

const columns: ColumnDef<Client>[] = [
  { id: "name", header: "Name", sortValue: (r) => r.name ?? "", cell: (r) => <span className="font-medium">{r.name ?? "—"}</span> },
  { id: "company", header: "Company", sortValue: (r) => r.company ?? "", cell: (r) => r.company ?? "—" },
  { id: "email", header: "Email", sortValue: (r) => r.email ?? "", cell: (r) => r.email ?? "—" },
  { id: "value", header: "Contract value", sortValue: (r) => r.contract_value_cents ?? 0, cell: (r) => formatCents(r.contract_value_cents) },
  { id: "status", header: "Status", sortValue: (r) => r.status ?? "", cell: (r) => <Badge variant="secondary">{r.status ?? "active"}</Badge> },
];

export default function ClientsListPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: () => api.clients.list(),
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
    <div className="p-6">
      <PageHeader
        title="Clients"
        description="Client relationships, revenue, and delivery history."
        action={
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add client
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      <DataTable
        columns={columns}
        data={list}
        isLoading={isLoading}
        exportable
        exportFileName="clients.csv"
        onRowClick={(r) => navigate(`/clients/${r.id}`)}
        emptyTitle="No clients yet"
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
