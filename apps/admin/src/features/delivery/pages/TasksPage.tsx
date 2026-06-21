import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { List, LayoutGrid, CalendarDays } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { DataTable, KanbanBoard, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskCommandHeader } from "../components/TaskCommandHeader";
import { TaskFiltersBar } from "../components/TaskFiltersBar";
import { TaskCard } from "../components/TaskCard";
import { TaskActivitySidebar } from "../components/TaskActivitySidebar";
import type { KanbanColumn } from "@/components/system";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  filterTasks,
  formatTaskDue,
  priorityMeta,
  assigneeInitials,
  assigneeLabel,
  type TaskRecord,
  type TaskFilters,
  type TaskSummary,
  type TaskActivityEvent,
} from "../task-schemas";

export default function TasksPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState<"list" | "kanban" | "calendar">("kanban");
  const [open, setOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planProjectId, setPlanProjectId] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [calDate, setCalDate] = useState<Date | undefined>(new Date());
  const [filters, setFilters] = useState<TaskFilters>({
    projectId: searchParams.get("project_id"),
    assigneeId: null,
    priority: null,
    status: null,
  });
  const [form, setForm] = useState({
    title: "",
    priority: "medium",
    due_at: "",
    project_id: searchParams.get("project_id") ?? "",
    assignee_user_id: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "tasks"],
    queryFn: () => api.tasks.list() as Promise<TaskRecord[]>,
  });

  const { data: summary } = useQuery({
    queryKey: ["admin", "tasks", "summary"],
    queryFn: () => api.tasks.summary() as Promise<TaskSummary>,
  });

  const { data: activity } = useQuery({
    queryKey: ["admin", "tasks", "activity"],
    queryFn: () => api.tasks.activity(20) as Promise<TaskActivityEvent[]>,
  });

  const { data: projectsRaw } = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () => api.projects.list() as Promise<{ id: string; name?: string }[]>,
  });

  const { data: teamRaw } = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => api.team.members() as Promise<{ user_id: string; email?: string }[]>,
  });

  const { data: calData } = useQuery({
    queryKey: ["admin", "tasks", "calendar"],
    queryFn: () => api.tasks.list({ view: "calendar" }) as Promise<TaskRecord[]>,
    enabled: view === "calendar",
  });

  const create = useMutation({
    mutationFn: () =>
      api.tasks.create({
        title: form.title,
        priority: form.priority,
        due_at: form.due_at || null,
        project_id: form.project_id || null,
        assignee_user_id: form.assignee_user_id || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "tasks"] });
      setOpen(false);
      setForm({
        title: "",
        priority: "medium",
        due_at: "",
        project_id: filters.projectId ?? "",
        assignee_user_id: "",
      });
      toast({ title: "Task created" });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.tasks.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "tasks"] });
      qc.invalidateQueries({ queryKey: ["admin", "tasks", "summary"] });
      qc.invalidateQueries({ queryKey: ["admin", "tasks", "activity"] });
    },
  });

  const tasks: TaskRecord[] = Array.isArray(data) ? data : [];
  const projects = Array.isArray(projectsRaw)
    ? projectsRaw.map((p) => ({ id: p.id, name: p.name ?? "Untitled project" }))
    : [];
  const members = Array.isArray(teamRaw) ? teamRaw : [];

  const projectCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (t.project_id) map.set(t.project_id, (map.get(t.project_id) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const filtered = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const calTasks: TaskRecord[] = Array.isArray(calData) ? calData : tasks;
  const dayTasks = calDate
    ? calTasks.filter((t) => t.due_at && isSameDay(parseISO(t.due_at), calDate))
    : [];

  const totalOpen = tasks.filter((t) => t.status !== "done").length;

  const kanbanColumns: KanbanColumn<TaskRecord>[] = TASK_STATUSES.map((status) => {
    const items = filtered.filter((t) => t.status === status);
    const colTotal = tasks.filter((t) => t.status === status).length;
    const pct = totalOpen > 0 && status !== "done"
      ? Math.round((items.length / Math.max(1, filtered.filter((t) => t.status !== "done").length)) * 100)
      : status === "done"
        ? 100
        : 0;
    return {
      id: status,
      title: `${TASK_STATUS_LABELS[status]} (${colTotal})`,
      subtitle: status === "done" ? `${colTotal} completed` : items.length ? `${pct}% of filtered` : "Empty",
      items,
    };
  });

  const columns: ColumnDef<TaskRecord>[] = [
    {
      id: "title",
      header: "Task",
      sortValue: (r) => r.title,
      cell: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      id: "project",
      header: "Project",
      sortValue: (r) => r.project_name ?? "",
      cell: (r) => r.project_name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "assignee",
      header: "Assignee",
      sortValue: (r) => r.assignee_name ?? r.assignee_email ?? "",
      cell: (r) =>
        r.assignee_user_id ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[9px]">
                {assigneeInitials(r.assignee_name, r.assignee_email)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{assigneeLabel(r.assignee_name, r.assignee_email)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Unassigned</span>
        ),
    },
    {
      id: "priority",
      header: "Priority",
      sortValue: (r) => r.priority ?? "",
      cell: (r) => {
        const p = priorityMeta(r.priority);
        return (
          <Badge variant="outline" className={p.badge}>
            {p.emoji} {p.label}
          </Badge>
        );
      },
    },
    {
      id: "due",
      header: "Due date",
      sortValue: (r) => r.due_at ?? "",
      cell: (r) => {
        const due = formatTaskDue(r.due_at, r.status);
        return <span className={due.className}>{due.tone === "none" ? "—" : due.label}</span>;
      },
    },
    {
      id: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => (
        <Badge variant="outline" className={TASK_STATUS_COLORS[r.status] ?? ""}>
          {TASK_STATUS_LABELS[r.status] ?? r.status}
        </Badge>
      ),
    },
  ];

  async function handleGeneratePlan() {
    if (!planProjectId) {
      setPlanOpen(true);
      return;
    }
    setPlanLoading(true);
    try {
      await api.projects.generatePlan(planProjectId);
      qc.invalidateQueries({ queryKey: ["admin", "tasks"] });
      qc.invalidateQueries({ queryKey: ["admin", "tasks", "summary"] });
      qc.invalidateQueries({ queryKey: ["admin", "tasks", "activity"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      setPlanOpen(false);
      toast({ title: "AI project plan generated", description: "Tasks and milestones were added to the project." });
    } catch (e) {
      toast({ title: "Plan generation failed", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setPlanLoading(false);
    }
  }

  const emptyColumn = (col: KanbanColumn<TaskRecord>) => (
    <div className="rounded-lg border border-dashed border-border bg-background/50 px-3 py-6 text-center">
      <p className="text-xs text-muted-foreground">No tasks here.</p>
      {col.id === "todo" ? (
        <div className="mt-2 space-y-1">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
            Create task
          </Button>
          <p className="text-[10px] text-muted-foreground">or generate a project plan</p>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground mt-2">Drag tasks here</p>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <TaskCommandHeader
        summary={summary}
        onNewTask={() => setOpen(true)}
        onGeneratePlan={() => setPlanOpen(true)}
        planLoading={planLoading}
      />

      <TaskFiltersBar
        filters={filters}
        onChange={setFilters}
        projects={projects}
        members={members}
        projectCounts={projectCounts}
      />

      <div className="flex justify-end">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="list" className="gap-1"><List className="h-3.5 w-3.5" /> List</TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1"><LayoutGrid className="h-3.5 w-3.5" /> Kanban</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1"><CalendarDays className="h-3.5 w-3.5" /> Calendar</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <BackendErrorAlert error={error} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="min-w-0">
          {view === "list" && (
            <DataTable
              columns={columns}
              data={filtered}
              isLoading={isLoading}
              emptyTitle="No tasks match your filters"
            />
          )}

          {view === "kanban" && (
            <KanbanBoard
              columns={kanbanColumns}
              compact
              onMove={(id, status) => update.mutate({ id, body: { status } })}
              renderCard={(t) => <TaskCard task={t} />}
              renderEmptyColumn={emptyColumn}
            />
          )}

          {view === "calendar" && (
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
              <Calendar mode="single" selected={calDate} onSelect={setCalDate} className="rounded-xl border" />
              <div className="space-y-2">
                <h3 className="font-medium">{calDate ? format(calDate, "EEEE, MMM d") : "Select a day"}</h3>
                {dayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks due this day.</p>
                ) : (
                  dayTasks.map((t) => (
                    <div key={t.id} className="rounded-lg border border-border bg-card p-3">
                      <TaskCard task={t} compact />
                      <Badge variant="outline" className={`mt-2 ${TASK_STATUS_COLORS[t.status] ?? ""}`}>
                        {TASK_STATUS_LABELS[t.status] ?? t.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <TaskActivitySidebar
          activity={Array.isArray(activity) ? activity : []}
          summary={summary}
          onGeneratePlan={() => setPlanOpen(true)}
          loading={planLoading}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Project</Label>
              <Select value={form.project_id || "none"} onValueChange={(v) => setForm({ ...form, project_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assignee</Label>
              <Select
                value={form.assignee_user_id || "none"}
                onValueChange={(v) => setForm({ ...form, assignee_user_id: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.email ?? m.user_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{priorityMeta(p).emoji} {priorityMeta(p).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
            </div>
            <Button className="w-full" disabled={!form.title || create.isPending} onClick={() => create.mutate()}>
              Create task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate project plan</DialogTitle>
            <DialogDescription>
              AI will create milestones and tasks with suggested phases for the selected project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Project</Label>
              <Select value={planProjectId || "none"} onValueChange={(v) => setPlanProjectId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose a project…</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!planProjectId || planLoading} onClick={handleGeneratePlan}>
              {planLoading ? "Generating…" : "Generate plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
