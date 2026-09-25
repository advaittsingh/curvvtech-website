import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, LayoutGrid, List, Plus, Search } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ProjectCardGrid } from "../components/ProjectCardGrid";
import { ProjectListKpis } from "../components/ProjectListKpis";
import { ProjectProgressRing } from "../components/ProjectProgressRing";
import type { ProjectListStats, ProjectRecord } from "../project-schemas";
import {
  PROJECT_STATUS_LABELS,
  computeListHealth,
  formatInr,
  formatShortDate,
  healthBg,
} from "../project-schemas";

type ViewMode = "cards" | "table";

export default function ProjectsListPage() {
  const api = useAdminApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const clientFilter = params.get("client_id") ?? undefined;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", client_id: clientFilter ?? "" });
  const [view, setView] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "projects", clientFilter, statusFilter, search],
    queryFn: () =>
      api.projects.list({
        clientId: clientFilter,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search || undefined,
      }) as Promise<ProjectRecord[]>,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "projects", "stats"],
    queryFn: () => api.projects.stats() as Promise<ProjectListStats>,
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

  const bulkArchive = useMutation({
    mutationFn: (ids: string[]) => api.projects.bulk({ action: "archive", ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      setSelected(new Set());
      toast({ title: "Projects archived" });
    },
  });

  const list = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const clientList = Array.isArray(clients) ? clients : [];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns: ColumnDef<ProjectRecord>[] = [
    {
      id: "name",
      header: "Project",
      sortValue: (r) => r.name ?? "",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <ProjectProgressRing value={r.progress_pct ?? 0} size={36} stroke={3} color={r.color ?? "#6366f1"} />
          <div>
            <span className="font-medium block">{r.name ?? "—"}</span>
            <span className="text-xs text-muted-foreground">{r.client_company ?? r.client_name}</span>
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (r) => r.status ?? "",
      cell: (r) => <Badge variant="secondary">{PROJECT_STATUS_LABELS[r.status ?? "active"] ?? r.status}</Badge>,
    },
    {
      id: "collected",
      header: "Collected",
      sortValue: (r) => r.collected_cents ?? 0,
      cell: (r) => <span className="text-emerald-700 font-medium">{formatInr(r.collected_cents)}</span>,
    },
    {
      id: "pending",
      header: "Pending",
      sortValue: (r) => r.pending_cents ?? 0,
      cell: (r) => formatInr(r.pending_cents),
    },
    {
      id: "deadline",
      header: "Deadline",
      sortValue: (r) => r.target_end_date ?? "",
      cell: (r) => (r.target_end_date ? formatShortDate(r.target_end_date) : "—"),
    },
    {
      id: "health",
      header: "Health",
      sortValue: (r) => computeListHealth(r),
      cell: (r) => {
        const h = computeListHealth(r);
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className={`h-2 w-2 rounded-full ${healthBg(h)}`} />
            {h}%
          </span>
        );
      },
    },
    {
      id: "owner",
      header: "Owner",
      sortValue: (r) => r.manager_email ?? "",
      cell: (r) => r.manager_email?.split("@")[0] ?? "—",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Projects"
        description="Central operating system for every client delivery — progress, payments, milestones, and AI insights."
        action={
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      <ProjectListKpis stats={stats} loading={statsLoading} />
      <BackendErrorAlert error={error} />

      {clientFilter && (
        <p className="text-sm text-muted-foreground">
          Filtered by client ·{" "}
          <button type="button" className="underline" onClick={() => navigate("/projects")}>
            Clear
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, clients, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border border-border p-0.5">
          <Button variant={view === "cards" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1" onClick={() => setView("cards")}>
            <LayoutGrid className="h-4 w-4" /> Cards
          </Button>
          <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1" onClick={() => setView("table")}>
            <List className="h-4 w-4" /> Table
          </Button>
        </div>
        {selected.size > 0 && (
          <Button variant="outline" size="sm" className="gap-1 h-9" onClick={() => bulkArchive.mutate(Array.from(selected))}>
            <Archive className="h-4 w-4" /> Archive ({selected.size})
          </Button>
        )}
      </div>

      {view === "cards" ? (
        isLoading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl border border-border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <ProjectCardGrid
            projects={list}
            selected={selected}
            onToggle={toggleSelect}
            onArchive={(ids) => bulkArchive.mutate(ids)}
          />
        )
      ) : (
        <DataTable
          columns={columns}
          data={list}
          isLoading={isLoading}
          exportable
          exportFileName="projects.csv"
          onRowClick={(r) => navigate(`/projects/${r.id}`)}
          emptyTitle="No projects"
        />
      )}

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
