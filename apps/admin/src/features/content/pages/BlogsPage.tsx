import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Blog = { id: string; title?: string; slug?: string; status?: string; createdAt?: string };

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  meta_title: string;
  meta_description: string;
  featured_image_url: string;
  status: string;
};

const emptyForm = (): BlogForm => ({
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  meta_title: "",
  meta_description: "",
  featured_image_url: "",
  status: "draft",
});

const columns: ColumnDef<Blog>[] = [
  { id: "title", header: "Title", sortValue: (r) => r.title ?? "", cell: (r) => <span className="font-medium">{r.title ?? "—"}</span> },
  { id: "slug", header: "Slug", sortValue: (r) => r.slug ?? "", cell: (r) => r.slug ?? "—" },
  { id: "status", header: "Status", sortValue: (r) => r.status ?? "", cell: (r) => <Badge variant="secondary">{r.status ?? "draft"}</Badge> },
];

export default function BlogsPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogForm>(emptyForm());
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "blogs"], queryFn: () => api.blogs.list() });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        slug: form.slug || form.title.toLowerCase().replace(/\s+/g, "-"),
      };
      if (editingId) return api.blogs.update(editingId, body);
      return api.blogs.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blogs"] });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm());
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.blogs.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blogs"] }),
  });

  const list: Blog[] = Array.isArray(data) ? data : [];

  async function openEdit(blog: Blog) {
    setEditingId(blog.id);
    const full = await api.blogs.get(blog.id);
    const b = full as BlogForm & { id: string };
    setForm({
      title: b.title ?? "",
      slug: b.slug ?? "",
      excerpt: b.excerpt ?? "",
      body: b.body ?? "",
      meta_title: b.meta_title ?? "",
      meta_description: b.meta_description ?? "",
      featured_image_url: b.featured_image_url ?? "",
      status: b.status ?? "draft",
    });
    setOpen(true);
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Blogs"
        description="Publish articles to your website."
        action={
          <Button size="sm" className="gap-2" onClick={() => { setEditingId(null); setForm(emptyForm()); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New post
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      <DataTable
        columns={[
          ...columns,
          {
            id: "actions",
            header: "",
            sortValue: () => "",
            cell: (r) => (
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ),
          },
        ]}
        data={list}
        isLoading={isLoading}
        exportable
        exportFileName="blogs.csv"
        emptyTitle="No blog posts"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit blog post" : "New blog post"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from title" /></div>
            <div><Label>Excerpt</Label><Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
            <div><Label>Body</Label><Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div><Label>Meta title (SEO)</Label><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} /></div>
            <div><Label>Meta description (SEO)</Label><Textarea rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></div>
            <div><Label>Featured image URL</Label><Input value={form.featured_image_url} onChange={(e) => setForm({ ...form, featured_image_url: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!form.title || save.isPending} onClick={() => save.mutate()}>
              {editingId ? "Save changes" : "Create post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
