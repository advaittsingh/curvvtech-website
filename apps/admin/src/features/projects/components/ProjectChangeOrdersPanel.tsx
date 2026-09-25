import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectChangeOrder } from "../project-schemas";
import { formatInr, formatShortDate } from "../project-schemas";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

type Props = { projectId: string; onCreateInvoice?: () => void };

export function ProjectChangeOrdersPanel({ projectId, onCreateInvoice }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", estimated_hours: "", cost: "" });

  const { data } = useQuery({
    queryKey: ["admin", "projects", projectId, "change-orders"],
    queryFn: () => api.projects.changeOrders(projectId) as Promise<ProjectChangeOrder[]>,
  });
  const list = Array.isArray(data) ? data : [];

  const create = useMutation({
    mutationFn: () => api.projects.addChangeOrder(projectId, {
      title: form.title,
      description: form.description,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
      cost_cents: form.cost ? Math.round(Number(form.cost) * 100) : 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "change-orders"] });
      setOpen(false);
      setForm({ title: "", description: "", estimated_hours: "", cost: "" });
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.projects.updateChangeOrder(projectId, id, { approval_status: "approved", status: "approved" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "change-orders"] }),
  });

  async function sendForClientApproval(co: ProjectChangeOrder) {
    try {
      await api.approvals.create({
        project_id: projectId,
        entity_type: "change_order",
        entity_id: co.id,
        title: `Approve change: ${co.title}`,
        description: co.description ?? `Estimated ${co.estimated_hours ?? 0}h · ${formatInr(co.cost_cents)}`,
      });
      qc.invalidateQueries({ queryKey: ["admin", "approvals", projectId] });
      toast({
        title: "Sent for client approval",
        description: "The client can approve this change in their portal.",
      });
    } catch (e) {
      toast({ title: "Could not send", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" className="h-8" onClick={onCreateInvoice}>Generate invoice</Button>
        <Button size="sm" className="gap-1 h-8" onClick={() => setOpen(!open)}><Plus className="h-3.5 w-3.5" /> New change order</Button>
      </div>
      {open && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
          <Input placeholder="New feature / extra work title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Est. hours" type="number" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} />
            <Input placeholder="Cost (₹)" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </div>
          <Button size="sm" disabled={!form.title || create.isPending} onClick={() => create.mutate()}>Create change order</Button>
        </div>
      )}
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No change orders — scope creep stays invisible until you log it.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((co) => (
            <li key={co.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{co.title}</p>
                  <p className="text-xs text-muted-foreground">{co.createdAt ? formatShortDate(co.createdAt) : ""} · {co.estimated_hours ?? 0}h · {formatInr(co.cost_cents)}</p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  <Badge variant="outline">{co.approval_status}</Badge>
                  <Badge variant="secondary">{co.payment_status}</Badge>
                  {co.approval_status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendForClientApproval(co)}>
                        <Send className="h-3 w-3" /> Client approval
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => approve.mutate(co.id)}>
                        Mark approved
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {co.description && <p className="text-sm mt-2 text-muted-foreground">{co.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
