import { motion } from "framer-motion";
import { Archive, ExternalLink, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectProgressRing } from "./ProjectProgressRing";
import type { ProjectRecord } from "../project-schemas";
import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  computeListHealth,
  deriveProgressPct,
  formatInr,
  formatShortDate,
  healthBg,
} from "../project-schemas";

type Props = {
  projects: ProjectRecord[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onArchive: (ids: string[]) => void;
};

export function ProjectCardGrid({ projects, selected, onToggle, onArchive }: Props) {
  const navigate = useNavigate();

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">No projects match your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {projects.map((p, i) => {
        const health = computeListHealth(p);
        const initials = (p.client_name ?? p.name ?? "?").slice(0, 2).toUpperCase();
        const color = p.color ?? "#6366f1";

        return (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="group relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
            onClick={() => navigate(`/projects/${p.id}`)}
          >
            <div className="absolute top-3 left-3">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={(e) => { e.stopPropagation(); onToggle(p.id); }}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-border"
              />
            </div>

            <div className="flex items-start justify-between gap-2 pl-6">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 shrink-0" style={{ backgroundColor: `${color}22` }}>
                  <AvatarFallback className="text-xs font-semibold" style={{ color }}>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{p.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{p.client_company ?? p.client_name ?? "—"}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/projects/${p.id}`)}>Open project</DropdownMenuItem>
                  {p.live_url && (
                    <DropdownMenuItem onClick={() => window.open(p.live_url!, "_blank")}>
                      <ExternalLink className="h-3.5 w-3.5 mr-2" /> Live site
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onArchive([p.id])}>
                    <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">
                {PROJECT_STATUS_LABELS[p.status ?? "active"] ?? p.status}
              </Badge>
              {p.priority && p.priority !== "medium" && (
                <Badge variant="outline" className="text-[10px]">{PROJECT_PRIORITY_LABELS[p.priority] ?? p.priority}</Badge>
              )}
              {p.project_type && <span className="text-[10px] text-muted-foreground">{p.project_type}</span>}
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-3 mt-4 items-center">
              <ProjectProgressRing value={deriveProgressPct(p)} size={52} color={color} />
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div>
                  <p className="text-muted-foreground">Collected</p>
                  <p className="font-medium text-emerald-700">{formatInr(p.collected_cents)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="font-medium">{formatInr(p.pending_cents)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deadline</p>
                  <p className="font-medium">{p.target_end_date ? formatShortDate(p.target_end_date) : "—"}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${healthBg(health)}`} />
                  <span className="font-medium">{health}% health</span>
                </div>
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
