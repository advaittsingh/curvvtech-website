import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Plus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { KanbanBoard } from "@/components/system";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/features/delivery/components/TaskCard";
import type { TaskRecord } from "@/features/delivery/task-schemas";
import { TASK_STATUS_LABELS, TASK_STATUSES } from "@/features/delivery/task-schemas";
import type { ProjectTask } from "../project-schemas";

type Props = {
  projectId: string;
  tasks: ProjectTask[];
  onGeneratePlan?: () => void;
  planLoading?: boolean;
};

export function ProjectTaskBoard({ projectId, tasks, onGeneratePlan, planLoading }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.tasks.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tasks", projectId] }),
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
      onMove={(id, status) => update.mutate({ id, status })}
      renderCard={(t) => <TaskCard task={t as TaskRecord} compact />}
      renderEmptyColumn={(col) => (
        <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
          <p className="text-xs text-muted-foreground">{col.id === "todo" ? "Create or generate tasks" : "Drag tasks here"}</p>
        </div>
      )}
      desktopColumns={4}
    />
  );
}
