import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader, StatCard } from "@/components/system";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type ColumnDef } from "@/components/system";

type Project = { id: string; name?: string; status?: string; progress_pct?: number };
type Invoice = { id: string; invoice_number?: string; status?: string; total_cents?: number };

const projectCols: ColumnDef<Project>[] = [
  { id: "name", header: "Project", sortValue: (r) => r.name ?? "", cell: (r) => r.name ?? "—" },
  { id: "status", header: "Status", sortValue: (r) => r.status ?? "", cell: (r) => r.status ?? "—" },
  { id: "progress", header: "Progress", sortValue: (r) => r.progress_pct ?? 0, cell: (r) => `${r.progress_pct ?? 0}%` },
];

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();

  const { data: client } = useQuery({
    queryKey: ["admin", "clients", id],
    queryFn: () => api.clients.get(id!),
    enabled: Boolean(id),
  });

  const { data: projects } = useQuery({
    queryKey: ["admin", "clients", id, "projects"],
    queryFn: () => api.clients.projects(id!),
    enabled: Boolean(id),
  });

  const { data: invoices } = useQuery({
    queryKey: ["admin", "invoices"],
    queryFn: () => api.invoices.list(),
  });

  if (!client || (typeof client === "object" && "error" in client)) {
    return <div className="p-6 text-stone-500">Client not found.</div>;
  }

  const c = client as { id: string; name?: string; company?: string; email?: string; contract_value_cents?: number; notes?: string };
  const projectList: Project[] = Array.isArray(projects) ? projects : [];
  const invoiceList: Invoice[] = Array.isArray(invoices)
    ? invoices.filter((i: { client_id?: string }) => i.client_id === id)
    : [];

  const lifetime = c.contract_value_cents ?? 0;
  const outstanding = invoiceList
    .filter((i) => !["paid", "cancelled"].includes(String(i.status)))
    .reduce((s, i) => s + (i.total_cents ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <PageHeader title={c.name ?? "Client"} description={c.company ?? c.email} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Lifetime revenue" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(lifetime / 100)} />
        <StatCard title="Projects completed" value={projectList.filter((p) => p.status === "completed").length} />
        <StatCard title="Outstanding balance" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(outstanding / 100)} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 text-sm space-y-2">
          <p><span className="text-stone-500">Email:</span> {c.email ?? "—"}</p>
          <p><span className="text-stone-500">Company:</span> {c.company ?? "—"}</p>
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <DataTable columns={projectCols} data={projectList} paginated={false} searchable={false} emptyTitle="No projects" />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          {invoiceList.length === 0 ? <p className="text-stone-500 text-sm">No invoices.</p> : (
            <ul className="text-sm space-y-2">
              {invoiceList.map((i) => (
                <li key={i.id} className="flex justify-between border-b border-stone-100 py-2">
                  <span>{i.invoice_number ?? i.id.slice(0, 8)}</span>
                  <span>{i.status}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <p className="text-sm text-stone-700">{c.notes ?? "No notes yet."}</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
