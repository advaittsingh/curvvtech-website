import { Calendar, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskRecord } from "../task-schemas";
import {
  assigneeInitials,
  assigneeLabel,
  formatTaskDue,
  priorityMeta,
} from "../task-schemas";

type Props = {
  task: TaskRecord;
  compact?: boolean;
};

export function TaskCard({ task, compact }: Props) {
  const priority = priorityMeta(task.priority);
  const due = formatTaskDue(task.due_at, task.status);

  return (
    <div className={cn("space-y-2.5", compact && "space-y-2")}>
      <div>
        <p className="font-semibold text-sm leading-snug text-foreground">{task.title}</p>
        {task.project_name && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{task.project_name}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", priority.badge)}>
          {priority.emoji} {priority.label}
        </Badge>
        {due.tone !== "none" && (
          <span className={cn("inline-flex items-center gap-1 text-[10px]", due.className)}>
            <Calendar className="h-3 w-3 shrink-0" />
            {due.label}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee_user_id ? (
            <>
              <Avatar className="h-6 w-6 border border-border">
                <AvatarFallback className="text-[9px] bg-muted font-medium">
                  {assigneeInitials(task.assignee_name, task.assignee_email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] text-muted-foreground truncate">
                {assigneeLabel(task.assignee_name, task.assignee_email)}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" />
              Unassigned
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
