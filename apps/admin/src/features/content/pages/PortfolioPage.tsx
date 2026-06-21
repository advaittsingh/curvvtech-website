import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader, EmptyState } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type PortfolioItem = {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  image_url?: string;
  project_url?: string;
  published?: boolean;
  case_study_body?: string;
  metrics_json?: unknown;
  before_image_url?: string;
  after_image_url?: string;
};

export default function PortfolioPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    image_url: "",
    project_url: "",
    published: true,
    case_study_body: "",
    metrics_json: "{}",
    before_image_url: "",
    after_image_url: "",
  });

  const { data, error } = useQuery({
    queryKey: ["admin", "content", "portfolio"],
    queryFn: () => api.content.portfolio.list(),
  });

  const save = useMutation({
    mutationFn: () => {
      let metrics_json: unknown = {};
      try {
        metrics_json = JSON.parse(form.metrics_json || "{}");
      } catch {
        metrics_json = {};
      }
      const body = { ...form, metrics_json };
      return editing?.id ? api.content.portfolio.update(editing.id, body) : api.content.portfolio.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "content", "portfolio"] });
      setEditing(null);
      setForm({ title: "", slug: "", description: "", image_url: "", project_url: "", published: true, case_study_body: "", metrics_json: "{}", before_image_url: "", after_image_url: "" });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.content.portfolio.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "content", "portfolio"] }),
  });

  const items: PortfolioItem[] = Array.isArray(data) ? data : [];

  function startEdit(p: PortfolioItem) {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug ?? "",
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      project_url: p.project_url ?? "",
      published: p.published !== false,
      case_study_body: p.case_study_body ?? "",
      metrics_json: p.metrics_json ? JSON.stringify(p.metrics_json, null, 2) : "{}",
      before_image_url: p.before_image_url ?? "",
      after_image_url: p.after_image_url ?? "",
    });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Portfolio"
        description="Case studies and work samples for the public website."
        action={
          <Button size="sm" className="gap-2" onClick={() => setEditing({ id: "", title: "" })}>
            <Plus className="h-4 w-4" /> Add case study
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      {items.length === 0 && !editing ? (
        <EmptyState title="No case studies" cta={<Button onClick={() => setEditing({ id: "", title: "" })}>Add case study</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {items.map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-4">
              <div className="flex justify-between gap-2">
                <p className="font-medium">{p.title}</p>
                <Badge variant={p.published ? "default" : "secondary"}>{p.published ? "Live" : "Draft"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.description ?? "—"}</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => startEdit(p)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="rounded-lg border border-border p-4 space-y-3 max-w-xl">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <div><Label>Case study body</Label><Textarea value={form.case_study_body} onChange={(e) => setForm({ ...form, case_study_body: e.target.value })} rows={5} /></div>
          <div><Label>Metrics JSON</Label><Textarea value={form.metrics_json} onChange={(e) => setForm({ ...form, metrics_json: e.target.value })} rows={4} className="font-mono text-xs" /></div>
          <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <div><Label>Before image URL</Label><Input value={form.before_image_url} onChange={(e) => setForm({ ...form, before_image_url: e.target.value })} /></div>
          <div><Label>After image URL</Label><Input value={form.after_image_url} onChange={(e) => setForm({ ...form, after_image_url: e.target.value })} /></div>
          <div><Label>Project URL</Label><Input value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /><Label>Published</Label></div>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} disabled={!form.title || save.isPending}>Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
