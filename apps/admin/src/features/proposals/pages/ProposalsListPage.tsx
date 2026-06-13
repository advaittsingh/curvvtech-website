import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { proposalsApi } from "../api";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Proposal } from "../api";

const columns: ColumnDef<Proposal>[] = [
  { id: "title", header: "Title", sortValue: (r) => r.title, cell: (r) => <span className="font-medium">{r.title}</span> },
  { id: "client", header: "Client", sortValue: (r) => r.clientName, cell: (r) => r.clientName },
  { id: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <Badge variant="secondary">{r.status}</Badge> },
  { id: "updated", header: "Updated", sortValue: (r) => r.updatedAt, cell: (r) => new Date(r.updatedAt).toLocaleDateString() },
];

export default function ProposalsListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", clientName: "" });

  const { data, isLoading } = useQuery({ queryKey: ["proposals"], queryFn: proposalsApi.list });
  const create = useMutation({
    mutationFn: () => proposalsApi.create(form),
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ["proposals"] }); setOpen(false); navigate(`/proposals/${p.id}`); },
  });

  return (
    <div className="p-6">
      <PageHeader title="Proposals" description="Build proposals from templates — PDF and share links." action={<Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New proposal</Button>} />
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} onRowClick={(r) => navigate(`/proposals/${r.id}`)} emptyTitle="No proposals" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New proposal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Client</Label><Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></div>
            <Button className="w-full" disabled={!form.title || create.isPending} onClick={() => create.mutate()}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
