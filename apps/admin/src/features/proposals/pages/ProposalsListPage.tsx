import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { ProposalKpiBar, ProposalStatusPipeline } from "../components/ProposalHeader";
import {
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_COLORS,
  PROPOSAL_TEMPLATES,
  formatInr,
  type ProposalStatus,
} from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Proposal = {
  id: string;
  title: string;
  client_name?: string | null;
  status: string;
  total_cents?: number;
  updatedAt?: string;
};

export default function ProposalsListPage() {
  const navigate = useNavigate();
  const api = useAdminApi();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", client_name: "", template_key: "shopify" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "proposals"],
    queryFn: () => api.proposals.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ["admin", "proposals", "pipeline-summary"],
    queryFn: () => api.proposals.pipelineSummary(),
  });

  const create = useMutation({
    mutationFn: () =>
      form.template_key
        ? api.proposals.createFromTemplate({ template_key: form.template_key, client_name: form.client_name, title: form.title })
        : api.proposals.create(form),
    onSuccess: (p: Proposal) => {
      qc.invalidateQueries({ queryKey: ["admin", "proposals"] });
      setOpen(false);
      navigate(`/proposals/${p.id}`);
    },
  });

  const list: Proposal[] = Array.isArray(data) ? data : [];
  const summaryData = summary && typeof summary === "object" && !("error" in summary) ? summary : null;

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of list) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [list]);

  const columns: ColumnDef<Proposal>[] = [
    { id: "title", header: "Title", sortValue: (r) => r.title, cell: (r) => <span className="font-medium">{r.title}</span> },
    { id: "client", header: "Client", sortValue: (r) => r.client_name ?? "", cell: (r) => r.client_name ?? "—" },
    {
      id: "value",
      header: "Value",
      sortValue: (r) => r.total_cents ?? 0,
      cell: (r) => formatInr(r.total_cents),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => {
        const st = (r.status in PROPOSAL_STATUS_LABELS ? r.status : "draft") as ProposalStatus;
        return <Badge variant="outline" className={PROPOSAL_STATUS_COLORS[st]}>{PROPOSAL_STATUS_LABELS[st]}</Badge>;
      },
    },
    {
      id: "updated",
      header: "Updated",
      sortValue: (r) => r.updatedAt ?? "",
      cell: (r) => (r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—"),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Proposals"
        description="Proposal management — pipeline, sharing, approval, and conversion to projects."
        action={
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New proposal
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      <ProposalKpiBar summary={summaryData as Parameters<typeof ProposalKpiBar>[0]["summary"]} />
      <ProposalStatusPipeline counts={statusCounts} />
      <DataTable
        columns={columns}
        data={list}
        isLoading={isLoading}
        onRowClick={(r) => navigate(`/proposals/${r.id}`)}
        emptyTitle="No proposals"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New proposal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Template</Label>
              <Select value={form.template_key} onValueChange={(v) => setForm({ ...form, template_key: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPOSAL_TEMPLATES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Client</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Masako India" /></div>
            <div><Label>Title (optional)</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Auto from template" /></div>
            <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate()}>Create from template</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
