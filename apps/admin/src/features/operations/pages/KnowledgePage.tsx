import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Article = { id: string; title: string; category: string; body?: string; published?: boolean; updatedAt?: string };

export default function KnowledgePage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", category: "general", body: "", published: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, error } = useQuery({ queryKey: ["admin", "knowledge"], queryFn: () => api.operations.knowledge.list() });
  const { data: articleDetail } = useQuery({
    queryKey: ["admin", "knowledge", viewId],
    queryFn: () => api.operations.knowledge.get(viewId!),
    enabled: Boolean(viewId),
  });

  const create = useMutation({
    mutationFn: () => api.operations.knowledge.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      setOpen(false);
      setForm({ title: "", category: "general", body: "", published: true });
      toast({ title: "Article created" });
    },
  });

  const update = useMutation({
    mutationFn: () => api.operations.knowledge.update(editingId!, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      setOpen(false);
      setEditingId(null);
      toast({ title: "Article updated" });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.operations.knowledge.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      setViewId(null);
      toast({ title: "Article deleted" });
    },
  });

  const list: Article[] = Array.isArray(data) ? data : [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
  }, [list, search]);

  function startEdit(a: Article) {
    setEditingId(a.id);
    setForm({ title: a.title, category: a.category, body: a.body ?? "", published: a.published !== false });
    setOpen(true);
    api.operations.knowledge.get(a.id).then((full) => {
      const f = full as Article;
      setForm({ title: f.title, category: f.category, body: f.body ?? "", published: f.published !== false });
    });
  }

  const detail = articleDetail as Article | undefined;

  return (
    <div className="p-6">
      <PageHeader
        title="Knowledge Base"
        description="Internal documentation for your team."
        action={
          <Button size="sm" className="gap-2" onClick={() => { setEditingId(null); setForm({ title: "", category: "general", body: "", published: true }); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New article
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      <div className="relative max-w-sm mt-4 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search articles…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li key={a.id} className="rounded-lg border border-border px-4 py-3 flex justify-between items-center gap-2">
              <button type="button" className="text-left flex-1" onClick={() => setViewId(a.id)}>
                <span className="font-medium">{a.title}</span>
                <span className="text-xs text-muted-foreground block">{a.category}</span>
              </button>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(a)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {viewId && detail && (
          <div className="rounded-lg border border-border p-4">
            <h2 className="font-semibold text-lg">{detail.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{detail.category}</p>
            <div className="mt-4 text-sm whitespace-pre-wrap">{detail.body ?? "No content."}</div>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit article" : "New article"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Body</Label><Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              <Label>Published</Label>
            </div>
            <Button
              className="w-full"
              disabled={!form.title || create.isPending || update.isPending}
              onClick={() => (editingId ? update.mutate() : create.mutate())}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
