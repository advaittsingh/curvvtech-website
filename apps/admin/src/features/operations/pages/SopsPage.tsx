import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type SopStep = { title: string; description: string; auto_create_task: boolean };

export default function SopsPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "general", description: "", project_type: "" });
  const [steps, setSteps] = useState<SopStep[]>([{ title: "", description: "", auto_create_task: true }]);

  const { data, error, isLoading } = useQuery({ queryKey: ["admin", "sops"], queryFn: () => api.operations.sops.list() });
  const run = useMutation({
    mutationFn: (id: string) => api.operations.sops.run(id, {}),
    onSuccess: (res: { tasks_created?: number }) => {
      toast({ title: `Created ${res.tasks_created ?? 0} tasks from SOP` });
      qc.invalidateQueries({ queryKey: ["admin", "tasks"] });
    },
  });
  const create = useMutation({
    mutationFn: () =>
      api.operations.sops.create({
        ...form,
        steps: steps.filter((s) => s.title.trim()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sops"] });
      setOpen(false);
      setForm({ title: "", category: "general", description: "", project_type: "" });
      setSteps([{ title: "", description: "", auto_create_task: true }]);
      toast({ title: "SOP created" });
    },
  });
  const list = Array.isArray(data) ? data : [];

  function addStep() {
    setSteps([...steps, { title: "", description: "", auto_create_task: true }]);
  }

  function removeStep(i: number) {
    setSteps(steps.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, patch: Partial<SopStep>) {
    setSteps(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="SOPs"
        description="Standard operating procedures — run to create tasks automatically."
        action={
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New SOP
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {list.map((s: { id: string; title: string; category: string; description?: string; steps?: unknown[] }) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{s.title}</h3>
                  <Badge variant="secondary">{s.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                <p className="text-xs text-muted-foreground mt-2">{Array.isArray(s.steps) ? s.steps.length : 0} steps</p>
              </div>
              <Button size="sm" className="gap-2 shrink-0" onClick={() => run.mutate(s.id)} disabled={run.isPending}>
                <Play className="h-4 w-4" /> Run SOP
              </Button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create SOP</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>Project type (optional)</Label><Input value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })} /></div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>Add step</Button>
              </div>
              {steps.map((step, i) => (
                <div key={i} className="rounded border border-border p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <Input placeholder={`Step ${i + 1} title`} value={step.title} onChange={(e) => updateStep(i, { title: e.target.value })} />
                    {steps.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea placeholder="Description" rows={2} value={step.description} onChange={(e) => updateStep(i, { description: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={step.auto_create_task}
                      onChange={(e) => updateStep(i, { auto_create_task: e.target.checked })}
                    />
                    Auto-create task when SOP runs
                  </label>
                </div>
              ))}
            </div>
            <Button className="w-full" disabled={!form.title || create.isPending} onClick={() => create.mutate()}>
              Create SOP
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
