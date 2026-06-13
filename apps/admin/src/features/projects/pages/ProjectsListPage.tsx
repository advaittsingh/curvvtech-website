import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Project = {
  id: string;
  name?: string;
  client_name?: string;
  progress_pct?: number;
  budget_cents?: number;
  deadline?: string;
  status?: string;
};

function formatCents(c?: number) {
  if (!c) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(c / 100);
}

const columns: ColumnDef<Project>[] = [
  { id: "name", header: "Name", sortValue: (r) => r.name ?? "", cell: (r) => <span className="font-medium">{r.name ?? "—"}</span> },
  { id: "client", header: "Client", sortValue: (r) => r.client_name ?? "", cell: (r) => r.client_name ?? "—" },
  {
    id: "progress",
    header: "Progress",
    sortValue: (r) => r.progress_pct ?? 0,
    cell: (r) => (
      <div className="flex items-center gap-2 min-w-[120px]">
        <Progress value={r.progress_pct ?? 0} className="h-2" />
        <span className="text-xs text-stone-500">{r.progress_pct ?? 0}%</span>
      </div>
    ),
  },
  { id: "budget", header: "Budget", sortValue: (r) => r.budget_cents ?? 0, cell: (r) => formatCents(r.budget_cents) },
  {
    id: "deadline",
    header: "Deadline",
    sortValue: (r) => r.deadline ?? "",
    cell: (r) => (r.deadline ? new Date(r.deadline).toLocaleDateString() : "—"),
  },
  { id: "status", header: "Status", sortValue: (r) => r.status ?? "", cell: (r) => <Badge variant="secondary">{r.status ?? "active"}</Badge> },
];

export default function ProjectsListPage() {
  const api = useAdminApi();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "projects"], queryFn: () => api.projects.list() });
  const list: Project[] = Array.isArray(data) ? data : [];

  return (
    <div className="p-6">
      <PageHeader
        title="Projects"
        description="Delivery hub — track progress, budget, and milestones."
        action={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New project</Button>}
      />
      <BackendErrorAlert error={error} />
      <DataTable
        columns={columns}
        data={list}
        isLoading={isLoading}
        exportable
        exportFileName="projects.csv"
        onRowClick={(r) => navigate(`/projects/${r.id}`)}
        emptyTitle="No projects"
      />
    </div>
  );
}
