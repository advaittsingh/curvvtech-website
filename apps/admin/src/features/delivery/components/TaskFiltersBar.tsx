import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TaskFilters } from "../task-schemas";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITY_META } from "../task-schemas";

type ProjectOption = { id: string; name: string };
type MemberOption = { user_id: string; email?: string };

type Props = {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  projects: ProjectOption[];
  members: MemberOption[];
  projectCounts: Map<string, number>;
};

export function TaskFiltersBar({ filters, onChange, projects, members, projectCounts }: Props) {
  const hasFilters = Boolean(filters.projectId || filters.assigneeId || filters.priority || filters.status);

  const topProjects = [...projects]
    .sort((a, b) => (projectCounts.get(b.id) ?? 0) - (projectCounts.get(a.id) ?? 0))
    .slice(0, 6);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">Projects</span>
        <Button
          size="sm"
          variant={filters.projectId ? "outline" : "secondary"}
          className={cn("h-7 text-xs rounded-full", !filters.projectId && "bg-primary/10 text-primary border-primary/20")}
          onClick={() => onChange({ ...filters, projectId: null })}
        >
          All projects
        </Button>
        {topProjects.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant="outline"
            className={cn(
              "h-7 text-xs rounded-full",
              filters.projectId === p.id && "bg-primary text-primary-foreground border-primary",
            )}
            onClick={() =>
              onChange({ ...filters, projectId: filters.projectId === p.id ? null : p.id })
            }
          >
            {p.name}
            {(projectCounts.get(p.id) ?? 0) > 0 && (
              <span className="ml-1 opacity-70">({projectCounts.get(p.id)})</span>
            )}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.assigneeId ?? "all"}
          onValueChange={(v) => onChange({ ...filters, assigneeId: v === "all" ? null : v })}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.email?.split("@")[0] ?? m.user_id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority ?? "all"}
          onValueChange={(v) => onChange({ ...filters, priority: v === "all" ? null : v })}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {TASK_PRIORITY_META[p]?.emoji} {TASK_PRIORITY_META[p]?.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => onChange({ ...filters, status: v === "all" ? null : v })}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs gap-1 text-muted-foreground"
            onClick={() => onChange({ projectId: null, assigneeId: null, priority: null, status: null })}
          >
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.projectId && (
            <Badge variant="secondary" className="text-xs">
              Project: {projects.find((p) => p.id === filters.projectId)?.name ?? "Selected"}
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="text-xs">
              {TASK_PRIORITY_META[filters.priority]?.label ?? filters.priority}
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="text-xs">
              {TASK_STATUS_LABELS[filters.status] ?? filters.status}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
