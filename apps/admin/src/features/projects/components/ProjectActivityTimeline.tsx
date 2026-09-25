import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  Banknote,
  Bot,
  FileUp,
  Flag,
  GitCommit,
  Globe,
  MessageSquare,
  Receipt,
  UserPlus,
} from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import type { FeedEvent } from "../project-schemas";
import { cn } from "@/lib/utils";

type Props = { projectId: string; className?: string };

type Group = { label: string; events: FeedEvent[] };

const ICON_MAP: Record<string, typeof GitCommit> = {
  file: FileUp,
  payment: Banknote,
  invoice: Receipt,
  milestone: Flag,
  meeting: MessageSquare,
  note: MessageSquare,
  team: UserPlus,
  portal: Globe,
  ai: Bot,
  project: GitCommit,
  activity: GitCommit,
};

function groupEvents(events: FeedEvent[]): Group[] {
  const today: FeedEvent[] = [];
  const yesterday: FeedEvent[] = [];
  const earlier: FeedEvent[] = [];

  for (const e of events) {
    const d = parseISO(e.created_at);
    if (isToday(d)) today.push(e);
    else if (isYesterday(d)) yesterday.push(e);
    else earlier.push(e);
  }

  const groups: Group[] = [];
  if (today.length) groups.push({ label: "Today", events: today });
  if (yesterday.length) groups.push({ label: "Yesterday", events: yesterday });
  if (earlier.length) groups.push({ label: "Earlier", events: earlier });
  return groups;
}

export function ProjectActivityTimeline({ projectId, className }: Props) {
  const api = useAdminApi();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "projects", projectId, "feed"],
    queryFn: () => api.projects.feed(projectId) as Promise<FeedEvent[]>,
    enabled: Boolean(projectId),
  });

  const events = Array.isArray(data) ? data : [];
  const groups = useMemo(() => groupEvents(events), [events]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className={cn("rounded-xl border border-dashed border-border bg-muted/10 py-12 text-center", className)}>
        <GitCommit className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1">Upload files, log payments, or complete milestones to build the timeline.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {groups.map((group) => (
        <section key={group.label}>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 sticky top-[120px] bg-background/90 py-1 z-10">
            {group.label}
          </h4>
          <ul className="space-y-0 border-l-2 border-border ml-3">
            {group.events.map((ev, i) => {
              const Icon = ICON_MAP[ev.icon ?? ev.event_type] ?? GitCommit;
              const time = format(parseISO(ev.created_at), "h:mm a");
              return (
                <motion.li
                  key={ev.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="relative pl-6 pb-4 last:pb-0 group"
                >
                  <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                    <Icon className="h-2.5 w-2.5 text-muted-foreground group-hover:text-primary" />
                  </span>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{ev.title}</p>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                    <time className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{time}</time>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
