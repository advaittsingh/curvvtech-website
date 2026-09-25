import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, ConfirmDialog, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { ProposalKpiBar, ProposalStatusPipeline } from "../components/ProposalHeader";
import { NewProposalDialog } from "../components/NewProposalDialog";
import {
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_COLORS,
  formatInr,
  type ProposalStatus,
} from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "proposals"],
    queryFn: () => api.proposals.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ["admin", "proposals", "pipeline-summary"],
    queryFn: () => api.proposals.pipelineSummary(),
  });

  const list: Proposal[] = Array.isArray(data) ? data : [];
  const summaryData = summary && typeof summary === "object" && !("error" in summary) ? summary : null;

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of list) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [list]);

  const remove = useMutation({
    mutationFn: (id: string) => api.proposals.remove(id),
    onSuccess: () => {
      toast({ title: "Proposal deleted" });
      setDeleteTarget(null);
      void refetch();
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

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
    {
      id: "actions",
      header: "",
      sortValue: () => "",
      cell: (r) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
          aria-label={`Delete ${r.title}`}
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(r);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
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
        emptyDescription="Create a proposal from a lead, client, or template — AI will use CRM context to personalize."
      />
      <NewProposalDialog open={open} onOpenChange={setOpen} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this proposal?"
        description={
          deleteTarget?.status === "converted"
            ? `"${deleteTarget.title}" was converted to a project. Deleting removes the proposal document only.`
            : deleteTarget
              ? `Permanently delete "${deleteTarget.title}"? This cannot be undone.`
              : undefined
        }
        confirmLabel="Delete proposal"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => {
          if (deleteTarget) void remove.mutateAsync(deleteTarget.id);
        }}
      />
    </div>
  );
}
