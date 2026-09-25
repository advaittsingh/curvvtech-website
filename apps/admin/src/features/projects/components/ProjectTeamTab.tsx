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
          const assignedMembers = members.filter((member) => member.role === key);
          return (
            <div key={key} className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              {assignedMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              ) : (
                <ul className="space-y-2">
                  {assignedMembers.map((member) => {
                    const openTasks = workload(member.user_id);
                    return (
                      <li key={member.user_id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium truncate">{formatOwnerDisplay(member.email)}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {openTasks > 0 && (
                            <Badge variant="secondary" className="text-xs">{openTasks} tasks</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${formatOwnerDisplay(member.email)} from ${label}`}
                            onClick={() => onRemove(member.user_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Select value="" onValueChange={(userId) => onAdd(userId, key)}>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder={`Add ${label.toLowerCase()}…`} />
                </SelectTrigger>
                <SelectContent>
                  {available.length === 0 ? (
                    <SelectItem value="no-members" disabled>No available team members</SelectItem>
                  ) : (
                    available.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.email ?? member.user_id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
