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

type Service = {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  published?: boolean;
  seo_title?: string;
  seo_description?: string;
  hero_image_url?: string;
  content_json?: unknown;
};

export default function ServicesPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    published: true,
    seo_title: "",
    seo_description: "",
    hero_image_url: "",
    content_json: "{}",
  });

  const { data, error } = useQuery({
    queryKey: ["admin", "content", "services"],
    queryFn: () => api.content.services.list(),
  });

  const save = useMutation({
    mutationFn: () => {
      let content_json: unknown = {};
      try {
        content_json = JSON.parse(form.content_json || "{}");
      } catch {
        content_json = {};
      }
      const body = { ...form, content_json };
      return editing?.id ? api.content.services.update(editing.id, body) : api.content.services.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "content", "services"] });
      setEditing(null);
      setForm({ title: "", slug: "", description: "", published: true, seo_title: "", seo_description: "", hero_image_url: "", content_json: "{}" });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.content.services.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "content", "services"] }),
  });

  const items: Service[] = Array.isArray(data) ? data : [];

  function startEdit(s: Service) {
    setEditing(s);
    setForm({
      title: s.title,
      slug: s.slug ?? "",
      description: s.description ?? "",
      published: s.published !== false,
      seo_title: s.seo_title ?? "",
      seo_description: s.seo_description ?? "",
      hero_image_url: s.hero_image_url ?? "",
      content_json: s.content_json ? JSON.stringify(s.content_json, null, 2) : "{}",
    });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Services"
        description="Manage website service pages — synced to the public site."
        action={
          <Button size="sm" className="gap-2" onClick={() => { setEditing({ id: "", title: "" }); setForm({ title: "", slug: "", description: "", published: true, seo_title: "", seo_description: "", hero_image_url: "", content_json: "{}" }); }}>
            <Plus className="h-4 w-4" /> Add service
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      {items.length === 0 && !editing ? (
        <EmptyState title="No services" description="Create your first service page." cta={<Button onClick={() => setEditing({ id: "", title: "" })}>Add service</Button>} />
      ) : (
        <ul className="space-y-3 mb-6">
          {items.map((s) => (
            <li key={s.id} className="rounded-lg border border-border p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.slug ?? "—"}</p>
                <Badge variant={s.published ? "default" : "secondary"} className="mt-2">{s.published ? "Published" : "Draft"}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(s)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className="rounded-lg border border-border p-4 space-y-3 max-w-xl">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from title" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
          <div><Label>SEO title</Label><Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} /></div>
          <div><Label>SEO description</Label><Textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} rows={2} /></div>
          <div><Label>Hero image URL</Label><Input value={form.hero_image_url} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })} /></div>
          <div><Label>Content JSON</Label><Textarea value={form.content_json} onChange={(e) => setForm({ ...form, content_json: e.target.value })} rows={6} className="font-mono text-xs" /></div>
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
