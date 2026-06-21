import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Zap } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader, DataTable, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Workflow = {
  id: string;
  name: string;
  trigger_type: string;
  enabled: boolean;
  trigger_config?: { to_status?: string };
};

const PRESETS = [
  {
    name: "Lead won → create project",
    trigger_type: "lead_status_change",
    trigger_config: { to_status: "won" },
    actions: [{ step_order: 0, action_type: "create_project", action_config: {} }],
  },
  {
    name: "Proposal sent → follow-up task",
    trigger_type: "lead_status_change",
    trigger_config: { to_status: "proposal_sent" },
    actions: [{ step_order: 0, action_type: "create_task", action_config: { title: "Follow up on proposal", due_in_days: 3 } }],
  },
];

export default function WorkflowsPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [presetIdx, setPresetIdx] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "workflows"],
    queryFn: () => api.workflows.list(),
  });

  const { data: runs } = useQuery({
    queryKey: ["admin", "workflows", "runs"],
    queryFn: () => api.workflows.runs(20),
  });

  const create = useMutation({
    mutationFn: () => {
      const p = PRESETS[presetIdx];
      return api.workflows.create(p);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "workflows"] });
      setOpen(false);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.workflows.update(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "workflows"] }),
  });

  const workflows: Workflow[] = Array.isArray(data) ? data : [];

  const columns: ColumnDef<Workflow>[] = [
    { id: "name", header: "Workflow", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: "trigger", header: "Trigger", sortValue: (r) => r.trigger_type, cell: (r) => r.trigger_type.replace(/_/g, " ") },
    {
      id: "enabled",
      header: "Active",
      sortValue: (r) => String(r.enabled),
      cell: (r) => (
        <Switch checked={r.enabled} onCheckedChange={(v) => toggle.mutate({ id: r.id, enabled: v })} />
      ),
    },
  ];

  const runList = Array.isArray(runs) ? runs : [];

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="Automations"
        description="Workflow engine — lead status changes trigger tasks, projects, and reminders."
        action={
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add workflow
          </Button>
        }
      />
      <BackendErrorAlert error={error} />
      <DataTable columns={columns} data={workflows} isLoading={isLoading} emptyTitle="No workflows" />

      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2"><Zap className="h-4 w-4" /> Recent runs</h3>
        <ul className="text-sm space-y-2">
          {runList.length === 0 ? (
            <li className="text-muted-foreground">No workflow runs yet.</li>
          ) : (
            runList.map((r: { id: string; workflow_name?: string; entity_type?: string; createdAt?: string }) => (
              <li key={r.id} className="flex justify-between rounded-lg border border-border px-3 py-2">
                <span>{r.workflow_name ?? "Workflow"} · {r.entity_type}</span>
                <span className="text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add workflow preset</DialogTitle></DialogHeader>
          <Label>Preset</Label>
          <Select value={String(presetIdx)} onValueChange={(v) => setPresetIdx(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRESETS.map((p, i) => (
                <SelectItem key={i} value={String(i)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full mt-4" onClick={() => create.mutate()}>Create workflow</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
