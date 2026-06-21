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

type TeamMember = {
  id: string;
  name: string;
  position?: string;
  bio?: string;
  photo_url?: string;
  linkedin_url?: string;
  published?: boolean;
};

export default function TeamCmsPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({ name: "", position: "", bio: "", photo_url: "", linkedin_url: "", published: true });

  const { data, error } = useQuery({
    queryKey: ["admin", "content", "team-members"],
    queryFn: () => api.content.teamMembers.list(),
  });

  const save = useMutation({
    mutationFn: () =>
      editing?.id ? api.content.teamMembers.update(editing.id, form) : api.content.teamMembers.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "content", "team-members"] });
      setEditing(null);
      setForm({ name: "", position: "", bio: "", photo_url: "", linkedin_url: "", published: true });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.content.teamMembers.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "content", "team-members"] }),
  });

  const items: TeamMember[] = Array.isArray(data) ? data : [];

  function startEdit(m: TeamMember) {
    setEditing(m);
    setForm({
      name: m.name,
      position: m.position ?? "",
      bio: m.bio ?? "",
      photo_url: m.photo_url ?? "",
      linkedin_url: m.linkedin_url ?? "",
      published: m.published !== false,
    });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Team page"
        description="Team members displayed on the public About / Team page."
        action={
          <Button size="sm" className="gap-2" onClick={() => { setEditing({ id: "", name: "" }); setForm({ name: "", position: "", bio: "", photo_url: "", linkedin_url: "", published: true }); }}>
            <Plus className="h-4 w-4" /> Add member
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      {items.length === 0 && !editing ? (
        <EmptyState title="No team members" cta={<Button onClick={() => setEditing({ id: "", name: "" })}>Add member</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {items.map((m) => (
            <div key={m.id} className="rounded-lg border border-border p-4">
              <div className="flex justify-between gap-2">
                <p className="font-medium">{m.name}</p>
                <Badge variant={m.published ? "default" : "secondary"}>{m.published ? "Live" : "Draft"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{m.position ?? "—"}</p>
              <p className="text-sm mt-2 line-clamp-2">{m.bio ?? ""}</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => startEdit(m)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(m.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="rounded-lg border border-border p-4 space-y-3 max-w-xl">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Position</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
          <div><Label>Bio</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} /></div>
          <div><Label>Photo URL</Label><Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} /></div>
          <div><Label>LinkedIn URL</Label><Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} /></div>
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
