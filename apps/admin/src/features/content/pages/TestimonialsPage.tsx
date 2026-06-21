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

type Testimonial = {
  id: string;
  name: string;
  company?: string;
  review?: string;
  rating?: number;
  image_url?: string;
  published?: boolean;
};

export default function TestimonialsPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState({ name: "", company: "", review: "", rating: "5", image_url: "", published: true });

  const { data, error } = useQuery({
    queryKey: ["admin", "content", "testimonials"],
    queryFn: () => api.content.testimonials.list(),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, rating: Number(form.rating) };
      return editing?.id ? api.content.testimonials.update(editing.id, body) : api.content.testimonials.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "content", "testimonials"] });
      setEditing(null);
      setForm({ name: "", company: "", review: "", rating: "5", image_url: "", published: true });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.content.testimonials.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "content", "testimonials"] }),
  });

  const items: Testimonial[] = Array.isArray(data) ? data : [];

  function startEdit(t: Testimonial) {
    setEditing(t);
    setForm({
      name: t.name,
      company: t.company ?? "",
      review: t.review ?? "",
      rating: String(t.rating ?? 5),
      image_url: t.image_url ?? "",
      published: t.published !== false,
    });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Testimonials"
        description="Client reviews shown on the public website."
        action={
          <Button size="sm" className="gap-2" onClick={() => { setEditing({ id: "", name: "" }); setForm({ name: "", company: "", review: "", rating: "5", image_url: "", published: true }); }}>
            <Plus className="h-4 w-4" /> Add testimonial
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      {items.length === 0 && !editing ? (
        <EmptyState title="No testimonials" cta={<Button onClick={() => setEditing({ id: "", name: "" })}>Add testimonial</Button>} />
      ) : (
        <ul className="space-y-3 mb-6">
          {items.map((t) => (
            <li key={t.id} className="rounded-lg border border-border p-4 flex justify-between gap-4">
              <div>
                <p className="font-medium">{t.name}{t.company ? ` · ${t.company}` : ""}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.review}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{t.rating ?? 5}★</Badge>
                  <Badge variant={t.published ? "default" : "secondary"}>{t.published ? "Live" : "Draft"}</Badge>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => startEdit(t)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className="rounded-lg border border-border p-4 space-y-3 max-w-xl">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Review</Label><Textarea value={form.review} onChange={(e) => setForm({ ...form, review: e.target.value })} rows={4} /></div>
          <div><Label>Rating (1–5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
          <div><Label>Photo URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /><Label>Published</Label></div>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
