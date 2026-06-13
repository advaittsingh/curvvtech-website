import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useLeads, useLeadMutations } from "../hooks/useLeads";
import type { Lead } from "../schemas";
import { DataTable, PageHeader, ConfirmDialog, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadFormValues } from "../schemas";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  in_discussion: "bg-purple-100 text-purple-800",
  proposal_sent: "bg-indigo-100 text-indigo-800",
  won: "bg-emerald-100 text-emerald-800",
  closed: "bg-stone-100 text-stone-600",
};

const columns: ColumnDef<Lead>[] = [
  {
    id: "name",
    header: "Name",
    sortValue: (r) => r.name ?? "",
    cell: (r) => <span className="font-medium">{r.name ?? r.email ?? "—"}</span>,
  },
  {
    id: "company",
    header: "Company",
    sortValue: (r) => r.company ?? "",
    cell: (r) => r.company ?? "—",
  },
  {
    id: "email",
    header: "Email",
    sortValue: (r) => r.email ?? "",
    cell: (r) => <span className="text-stone-600">{r.email ?? "—"}</span>,
  },
  {
    id: "source",
    header: "Source",
    sortValue: (r) => r.source ?? "",
    cell: (r) => r.source ?? "—",
  },
  {
    id: "status",
    header: "Status",
    sortValue: (r) => r.status ?? "",
    cell: (r) => (
      <Badge className={statusColors[String(r.status)] ?? "bg-stone-100"}>
        {String(r.status ?? "new").replace(/_/g, " ")}
      </Badge>
    ),
  },
];

export default function LeadsListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useLeads();
  const { create, remove } = useLeadMutations();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const list: Lead[] = Array.isArray(data) ? data : [];

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: "new", source: "manual" },
  });

  async function onCreate(values: LeadFormValues) {
    await create.mutateAsync(values);
    setCreateOpen(false);
    form.reset({ status: "new", source: "manual" });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Leads"
        description="CRM pipeline — capture, qualify, and convert enquiries."
        action={
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New lead
          </Button>
        }
      />

      <BackendErrorAlert error={error} />

      <DataTable
        columns={columns}
        data={list}
        isLoading={isLoading}
        exportable
        exportFileName="leads.csv"
        onRowClick={(row) => navigate(`/leads/${row.id}`)}
        emptyTitle="No leads yet"
        emptyDescription="Create a lead or wait for inbound enquiries."
        emptyCta={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Create lead
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" {...form.register("email")} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...form.register("phone")} />
              </div>
            </div>
            <div>
              <Label>Company</Label>
              <Input {...form.register("company")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Input {...form.register("source")} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as LeadFormValues["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["new", "contacted", "in_discussion", "proposal_sent", "won"].map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full">
              {create.isPending ? "Saving…" : "Create lead"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={() => setDeleteId(null)}
        title="Archive lead?"
        description="This will mark the lead as closed."
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) await remove.mutateAsync(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
