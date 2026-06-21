import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectMember, ProjectTask } from "../project-schemas";
import { TEAM_ROLES } from "../project-schemas";
import { formatOwnerDisplay } from "../../clients/constants";

type TeamMember = { user_id: string; email?: string };

type Props = {
  members: ProjectMember[];
  tasks: ProjectTask[];
  available: TeamMember[];
  onAdd: (userId: string, role: string) => void;
  onRemove: (userId: string) => void;
};

export function ProjectTeamTab({ members, tasks, available, onAdd, onRemove }: Props) {
  const workload = (userId: string) => tasks.filter((t) => t.assignee_user_id === userId && t.status !== "done").length;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-3">
        {TEAM_ROLES.map(({ key, label }) => {
          const assigned = members.find((m) => (m.role ?? "").includes(key.replace("_", "")) || m.role === key);
          const openTasks = assigned ? workload(assigned.user_id) : 0;
          return (
            <div key={key} className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="font-medium mt-1">
                {assigned ? formatOwnerDisplay(assigned.email) : <span className="text-muted-foreground">Unassigned</span>}
              </p>
              {assigned && openTasks > 0 && (
                <Badge variant="secondary" className="mt-2 text-xs">{openTasks} open tasks</Badge>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Select onValueChange={(v) => onAdd(v, "member")}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Add team member…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.email ?? m.user_id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members assigned.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-medium">{formatOwnerDisplay(m.email)}</span>
                  <span className="text-muted-foreground ml-2">{m.role ?? m.curvvtech_role}</span>
                  {workload(m.user_id) > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">{workload(m.user_id)} tasks</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRemove(m.user_id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
