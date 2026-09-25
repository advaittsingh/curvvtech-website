import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ProjectRevision } from "../project-schemas";
import { formatShortDate } from "../project-schemas";

type Props = { projectId: string };

export function ProjectRevisionsPanel({ projectId }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ requested_by: "", description: "", hours_spent: "", completed_by: "" });

  const { data } = useQuery({
    queryKey: ["admin", "projects", projectId, "revisions"],
    queryFn: () => api.projects.revisions(projectId) as Promise<ProjectRevision[]>,
  });
  const list = Array.isArray(data) ? data : [];

  const create = useMutation({
    mutationFn: () => api.projects.addRevision(projectId, {
      ...form,
      hours_spent: form.hours_spent ? Number(form.hours_spent) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "revisions"] });
      setOpen(false);
      setForm({ requested_by: "", description: "", hours_spent: "", completed_by: "" });
      toast({ title: "Revision logged" });
    },
  });

  const approve = useMutation({
    mutationFn: (rid: string) => api.projects.updateRevision(projectId, rid, { approved: true, status: "approved" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "revisions"] }),
  });

  const remove = useMutation({
    mutationFn: (rid: string) => api.projects.removeRevision(projectId, rid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "revisions"] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1 h-8" onClick={() => setOpen(!open)}><Plus className="h-3.5 w-3.5" /> Log revision</Button>
      </div>
      {open && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
          <Input placeholder="Requested by" value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} />
          <Textarea placeholder="Description of changes" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Hours spent" type="number" value={form.hours_spent} onChange={(e) => setForm({ ...form, hours_spent: e.target.value })} />
            <Input placeholder="Completed by" value={form.completed_by} onChange={(e) => setForm({ ...form, completed_by: e.target.value })} />
          </div>
          <Button size="sm" disabled={!form.description || create.isPending} onClick={() => create.mutate()}>Save revision</Button>
        </div>
      )}
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No client revisions tracked yet.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">Revision #{r.revision_number}</p>
                  <p className="text-xs text-muted-foreground">Requested by {r.requested_by || "Client"} · {r.createdAt ? formatShortDate(r.createdAt) : ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={r.approved ? "default" : "secondary"}>{r.approved ? "Approved" : r.status ?? "pending"}</Badge>
                  {!r.approved && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => approve.mutate(r.id)}>Approve</Button>}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <p className="text-sm mt-2">{r.description}</p>
              {(r.hours_spent || r.completed_by) && (
                <p className="text-xs text-muted-foreground mt-1">{r.hours_spent ? `${r.hours_spent}h` : ""}{r.completed_by ? ` · ${r.completed_by}` : ""}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
