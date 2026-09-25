import { Activity, Clock, MoreVertical, Copy, Download, Pencil, Trash2, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CATEGORY_STYLES, triggerIcon } from "../automations.constants";
import { deriveCategory, relativeTime } from "../automations.utils";
import type { Workflow } from "../automations.types";
import { WorkflowFlowDiagram } from "./WorkflowFlowDiagram";

type Props = {
  workflow: Workflow;
  runCount: number;
  successRate: number;
  lastRun?: string;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onRunTest: () => void;
};

export function WorkflowCard({
  workflow,
  runCount,
  successRate,
  lastRun,
  onToggle,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onRunTest,
}: Props) {
  const category = deriveCategory(workflow);
  const Icon = triggerIcon(workflow.trigger_type);
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-md",
        workflow.enabled ? "border-border" : "border-dashed border-border opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", CATEGORY_STYLES[category])}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <button className="text-left text-sm font-semibold leading-snug hover:underline" onClick={onEdit}>
              {workflow.name}
            </button>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[10px] capitalize", CATEGORY_STYLES[category])}>
                {category}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  workflow.enabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-500",
                )}
              >
                {workflow.enabled ? "Active" : "Paused"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={workflow.enabled} onCheckedChange={onToggle} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRunTest}>
                <PlayCircle className="mr-2 h-4 w-4" /> Run test
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" /> Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-muted/40 p-3">
        <WorkflowFlowDiagram workflow={workflow} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" /> {runCount} runs · {successRate}% ok
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {relativeTime(lastRun)}
        </span>
      </div>
    </div>
  );
}
