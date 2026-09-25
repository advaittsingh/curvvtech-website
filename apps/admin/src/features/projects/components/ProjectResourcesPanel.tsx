import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectResource } from "../project-schemas";

type Props = { projectId: string; team: { user_id: string; email?: string }[] };

export function ProjectResourcesPanel({ projectId, team }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");

  const { data } = useQuery({
    queryKey: ["admin", "projects", projectId, "resources"],
    queryFn: () => api.projects.resources(projectId) as Promise<ProjectResource[]>,
  });
  const list = Array.isArray(data) ? data : [];
  const assigned = new Set(list.map((r) => r.user_id));
  const available = team.filter((t) => !assigned.has(t.user_id));

  const add = useMutation({
    mutationFn: () => api.projects.upsertResource(projectId, { user_id: userId, role: "developer", allocation_pct: 50, estimated_hours: 40, weekly_capacity_hours: 40 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "resources"] });
      setUserId("");
    },
  });

  const update = useMutation({
    mutationFn: ({ rid, body }: { rid: string; body: object }) => {
      const row = list.find((r) => r.id === rid);
      return api.projects.upsertResource(projectId, { user_id: row?.user_id, ...body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "resources"] }),
  });

  const remove = useMutation({
    mutationFn: (rid: string) => api.projects.removeResource(projectId, rid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "resources"] }),
  });

  const totalAllocation = list.reduce((s, r) => s + Number(r.allocation_pct ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-1">Team capacity on this project</p>
        <Progress value={Math.min(100, totalAllocation)} className="h-2" />
        <p className="text-xs mt-1">{totalAllocation}% allocated across {list.length} members</p>
      </div>

      {available.length > 0 && (
        <div className="flex gap-2">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Add team member" /></SelectTrigger>
            <SelectContent>
              {available.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.email ?? m.user_id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1 h-9" disabled={!userId} onClick={() => add.mutate()}><Plus className="h-3.5 w-3.5" /> Add</Button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No resources allocated — assign team to track workload.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((r) => {
            const util = Math.min(100, Math.round((Number(r.actual_hours ?? 0) / Math.max(1, Number(r.estimated_hours ?? 1))) * 100));
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">{r.email?.split("@")[0] ?? "Member"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.role} · {r.allocation_pct}% allocated</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Hours</p>
                    <p className="font-medium">{r.actual_hours ?? 0}/{r.estimated_hours ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Open tasks</p>
                    <p className="font-medium">{r.open_tasks ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Efficiency</p>
                    <p className="font-medium">{r.efficiency_pct ?? 100}%</p>
                  </div>
                </div>
                <Progress value={util} className="h-1 mt-2" />
                <div className="flex gap-2 mt-2">
                  <Input type="number" className="h-7 text-xs" placeholder="Alloc %" defaultValue={r.allocation_pct}
                    onBlur={(e) => update.mutate({ rid: r.id, body: { allocation_pct: Number(e.target.value) } })} />
                  <Input type="number" className="h-7 text-xs" placeholder="Actual hrs" defaultValue={r.actual_hours}
                    onBlur={(e) => update.mutate({ rid: r.id, body: { actual_hours: Number(e.target.value) } })} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
