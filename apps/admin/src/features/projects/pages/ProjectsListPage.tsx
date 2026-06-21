import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectRecord } from "../project-schemas";
import { PROJECT_STATUS_LABELS, formatInr, formatShortDate } from "../project-schemas";

const columns: ColumnDef<ProjectRecord>[] = [
  { id: "name", header: "Name", sortValue: (r) => r.name ?? "", cell: (r) => <span className="font-medium">{r.name ?? "—"}</span> },
  { id: "client", header: "Client", sortValue: (r) => r.client_name ?? "", cell: (r) => r.client_name ?? "—" },
  {
    id: "progress",
    header: "Progress",
    sortValue: (r) => r.progress_pct ?? 0,
    cell: (r) => (
      <div className="flex items-center gap-2 min-w-[120px]">
        <Progress value={r.progress_pct ?? 0} className="h-2" />
        <span className="text-xs text-muted-foreground">{r.progress_pct ?? 0}%</span>
      </div>
    ),
  },
  { id: "budget", header: "Budget", sortValue: (r) => r.budget_cents ?? 0, cell: (r) => formatInr(r.budget_cents) },
  {
    id: "deadline",
    header: "Deadline",
    sortValue: (r) => r.target_end_date ?? "",
    cell: (r) => (r.target_end_date ? formatShortDate(r.target_end_date) : "—"),
  },
  {
    id: "status",
    header: "Status",
    sortValue: (r) => r.status ?? "",
    cell: (r) => <Badge variant="secondary">{PROJECT_STATUS_LABELS[r.status ?? "active"] ?? r.status ?? "active"}</Badge>,
  },
];

export default function ProjectsListPage() {
  const api = useAdminApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const clientFilter = params.get("client_id") ?? undefined;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", client_id: clientFilter ?? "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "projects", clientFilter],
    queryFn: () => api.projects.list(clientFilter) as Promise<ProjectRecord[]>,
  });

  const { data: clients } = useQuery({ queryKey: ["admin", "clients"], queryFn: () => api.clients.list() });

  const create = useMutation({
    mutationFn: () => api.projects.create({ name: form.name, client_id: form.client_id }),
    onSuccess: (p: { id: string }) => {
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      setOpen(false);
      navigate(`/projects/${p.id}`);
    },
  });

  const list = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const clientList = Array.isArray(clients) ? clients : [];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Projects"
        description="Delivery command center — track progress, budget, milestones, and AI insights."
        action={
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      {clientFilter && (
        <p className="text-sm text-muted-foreground mb-3">Filtered by client · <button type="button" className="underline" onClick={() => navigate("/projects")}>Clear</button></p>
      )}
      <DataTable
        columns={columns}
        data={list}
        isLoading={isLoading}
        exportable
        exportFileName="projects.csv"
        onRowClick={(r) => navigate(`/projects/${r.id}`)}
        emptyTitle="No projects"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clientList.map((c: { id: string; name?: string; company?: string }) => (
                    <SelectItem key={c.id} value={c.id}>{c.company ?? c.name ?? c.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!form.name || !form.client_id || create.isPending} onClick={() => create.mutate()}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
