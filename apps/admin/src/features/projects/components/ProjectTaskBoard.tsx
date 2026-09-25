import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Plus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { KanbanBoard } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCard } from "@/features/delivery/components/TaskCard";
import { useToast } from "@/hooks/use-toast";
import type { TaskRecord } from "@/features/delivery/task-schemas";
import { TASK_STATUS_LABELS, TASK_STATUSES } from "@/features/delivery/task-schemas";
import type { ProjectMember, ProjectTask } from "../project-schemas";

type Props = {
  projectId: string;
  tasks: ProjectTask[];
  members: ProjectMember[];
  onGeneratePlan?: () => void;
  planLoading?: boolean;
};

export function ProjectTaskBoard({ projectId, tasks, members, onGeneratePlan, planLoading }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.tasks.update(id, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "tasks", projectId] });
      if ("assignee_user_id" in variables.body) toast({ title: "Task assignee updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update task", description: error.message, variant: "destructive" });
    },
  });

  const columns = TASK_STATUSES.map((status) => ({
    id: status,
    title: `${TASK_STATUS_LABELS[status]} (${tasks.filter((t) => t.status === status).length})`,
    items: tasks.filter((t) => t.status === status),
  }));

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center max-w-lg">
        <p className="font-medium">No tasks created yet</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Generate a project plan using AI or create your first task manually.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {onGeneratePlan && (
            <Button size="sm" className="gap-1" onClick={onGeneratePlan} disabled={planLoading}>
              <Sparkles className="h-3.5 w-3.5" /> Generate plan
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1" asChild>
            <a href={`/tasks?project_id=${projectId}`}>
              <Plus className="h-3.5 w-3.5" /> Create task
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <KanbanBoard
      columns={columns}
      compact
      onMove={(id, status) => update.mutate({ id, body: { status } })}
      renderCard={(task) => (
        <div>
          <TaskCard task={task as TaskRecord} compact />
          <div
            className="mt-2 border-t border-border pt-2"
            draggable={false}
            onDragStart={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <Select
              value={task.assignee_user_id ?? "unassigned"}
              onValueChange={(userId) =>
                update.mutate({
                  id: task.id,
                  body: { assignee_user_id: userId === "unassigned" ? null : userId },
                })
              }
            >
              <SelectTrigger className="h-7 w-full text-xs">
                <SelectValue placeholder="Assign team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.email ?? member.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      renderEmptyColumn={(col) => (
        <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
          <p className="text-xs text-muted-foreground">{col.id === "todo" ? "Create or generate tasks" : "Drag tasks here"}</p>
        </div>
      )}
      desktopColumns={4}
    />
  );
}
