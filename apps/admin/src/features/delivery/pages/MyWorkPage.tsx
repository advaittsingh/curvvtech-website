import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, CircleDot, Clock3, FolderKanban, MessageSquare } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TASK_STATUSES,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  formatTaskDue,
  priorityMeta,
  type TaskRecord,
} from "../task-schemas";

const STATUS_ICONS = {
  todo: CircleDot,
  in_progress: Clock3,
  review: CalendarClock,
  done: CheckCircle2,
} as const;

export default function MyWorkPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [commentTask, setCommentTask] = useState<TaskRecord | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const query = useQuery({
    queryKey: ["admin", "tasks", "mine"],
    queryFn: () => api.tasks.mine(),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.tasks.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tasks", "mine"] }),
  });

  const comments = useQuery({
    queryKey: ["admin", "tasks", commentTask?.id, "comments"],
    queryFn: () => api.tasks.comments(commentTask!.id),
    enabled: Boolean(commentTask?.id),
  });

  const addComment = useMutation({
    mutationFn: () => api.tasks.addComment(commentTask!.id, commentBody.trim()),
    onSuccess: () => {
      setCommentBody("");
      qc.invalidateQueries({ queryKey: ["admin", "tasks", commentTask?.id, "comments"] });
    },
  });

  const tasks: TaskRecord[] = Array.isArray(query.data) ? query.data : query.data?.tasks ?? [];
  const grouped = useMemo(
    () => Object.fromEntries(TASK_STATUSES.map((status) => [status, tasks.filter((task) => task.status === status)])),
    [tasks],
  ) as Record<(typeof TASK_STATUSES)[number], TaskRecord[]>;
  const overdue = tasks.filter((task) => formatTaskDue(task.due_at, task.status).tone === "overdue").length;

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Personal workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">My work</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only tasks assigned to you are shown here.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Assigned", tasks.length],
          ["In progress", grouped.in_progress.length],
          ["In review", grouped.review.length],
          ["Overdue", overdue],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <BackendErrorAlert error={query.error} />

      {query.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading your tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
          <h2 className="mt-3 font-medium">You’re all caught up</h2>
          <p className="mt-1 text-sm text-muted-foreground">Assigned tasks will appear here.</p>
        </div>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-4">
          {TASK_STATUSES.map((status) => {
            const Icon = STATUS_ICONS[status];
            return (
              <section key={status} className="rounded-xl border border-border bg-muted/25 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h2>
                  <Badge variant="secondary" className="ml-auto">{grouped[status].length}</Badge>
                </div>
                <div className="space-y-3">
                  {grouped[status].length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">No tasks</div>
                  ) : grouped[status].map((task) => {
                    const due = formatTaskDue(task.due_at, task.status);
                    const priority = priorityMeta(task.priority);
                    return (
                      <article key={task.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                        <div className="flex items-start gap-2">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priority.dot}`} />
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium leading-5">{task.title}</h3>
                            {task.project_name && (
                              <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <FolderKanban className="h-3 w-3 shrink-0" /> {task.project_name}
                              </p>
                            )}
                          </div>
                        </div>
                        {task.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className={`text-xs ${due.className}`}>{due.label}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setCommentTask(task)}
                              aria-label={`Comments for ${task.title}`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                            <Select
                              value={task.status}
                              onValueChange={(next) => update.mutate({ id: task.id, status: next })}
                              disabled={update.isPending}
                            >
                              <SelectTrigger className="h-7 w-[112px] text-xs" aria-label={`Change status for ${task.title}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TASK_STATUSES.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    <span className={TASK_STATUS_COLORS[option]}>{TASK_STATUS_LABELS[option]}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(commentTask)}
        onOpenChange={(open) => {
          if (!open) {
            setCommentTask(null);
            setCommentBody("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{commentTask?.title ?? "Task comments"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {comments.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments…</p>
            ) : comments.data?.length ? (
              comments.data.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium">{comment.author_name}</p>
                    <time className="text-[11px] text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
          </div>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (commentBody.trim()) addComment.mutate();
            }}
          >
            <Textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Add an update or ask a question…"
              maxLength={4000}
            />
            {addComment.error && (
              <p className="text-sm text-destructive">{(addComment.error as Error).message}</p>
            )}
            <Button type="submit" disabled={!commentBody.trim() || addComment.isPending}>
              {addComment.isPending ? "Posting…" : "Post comment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
