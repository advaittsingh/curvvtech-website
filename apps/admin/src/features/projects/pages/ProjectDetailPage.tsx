import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const TIMELINE = ["Created", "Design started", "Development started", "Testing", "Delivered"];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();

  const { data: project } = useQuery({ queryKey: ["admin", "projects", id], queryFn: () => api.projects.get(id!), enabled: Boolean(id) });
  const { data: milestones } = useQuery({ queryKey: ["admin", "projects", id, "milestones"], queryFn: () => api.projects.milestones(id!), enabled: Boolean(id) });
  const { data: updates } = useQuery({ queryKey: ["admin", "projects", id, "updates"], queryFn: () => api.projects.updates(id!), enabled: Boolean(id) });

  if (!project || (typeof project === "object" && "error" in project)) {
    return <div className="p-6 text-stone-500">Project not found.</div>;
  }

  const p = project as Record<string, unknown>;
  const ms = Array.isArray(milestones) ? milestones : [];
  const ups = Array.isArray(updates) ? updates : [];

  return (
    <div className="p-6 space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-stone-600"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <PageHeader title={String(p.name ?? "Project")} description={String(p.client_name ?? "")} />
      <div className="flex items-center gap-4">
        <Progress value={Number(p.progress_pct ?? 0)} className="flex-1 h-3" />
        <span className="text-sm font-medium">{Number(p.progress_pct ?? 0)}%</span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          {["overview", "tasks", "timeline", "files", "invoices", "notes", "team"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="mt-4 text-sm space-y-2">
          <p>Status: <strong>{String(p.status ?? "active")}</strong></p>
          <p>Budget: {p.budget_cents ? `₹${Number(p.budget_cents) / 100}` : "—"}</p>
        </TabsContent>
        <TabsContent value="tasks" className="mt-4 text-sm text-stone-500">Task board coming soon — linked to milestones.</TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <ol className="relative border-l border-stone-200 ml-3 space-y-6">
            {TIMELINE.map((step, i) => (
              <li key={step} className="ml-6">
                <span className="absolute -left-1.5 flex h-3 w-3 rounded-full bg-stone-800" />
                <p className="font-medium text-stone-800">{step}</p>
                {ms[i] && <p className="text-xs text-stone-500">{(ms[i] as { title?: string }).title}</p>}
              </li>
            ))}
          </ol>
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <ul className="space-y-2 text-sm">
            {ups.map((u: { id: string; body?: string }) => (
              <li key={u.id} className="border-b border-stone-100 pb-2">{u.body}</li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="files" className="mt-4 text-sm text-stone-500">File uploads — integrate with project storage.</TabsContent>
        <TabsContent value="invoices" className="mt-4 text-sm text-stone-500">Linked invoices for this project.</TabsContent>
        <TabsContent value="team" className="mt-4 text-sm text-stone-500">Assigned team members.</TabsContent>
      </Tabs>
    </div>
  );
}
