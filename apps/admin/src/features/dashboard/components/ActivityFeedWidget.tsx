import { Link } from "react-router-dom";
import {
  Banknote,
  Bell,
  Bot,
  Calendar,
  FileText,
  Flag,
  FolderKanban,
  GitCommit,
  Inbox,
  Receipt,
} from "lucide-react";
import type { DashboardOverview } from "../dashboard.types";
import { formatCompactInr, formatRelativeTime } from "../dashboard.utils";
import { DashboardCard } from "./DashboardCard";

const ICONS: Record<string, typeof GitCommit> = {
  payment: Banknote,
  invoice: Receipt,
  lead: Inbox,
  proposal: FileText,
  project: FolderKanban,
  task: Flag,
  demo: Bot,
  activity: GitCommit,
};

const ICON_COLORS: Record<string, string> = {
  payment: "bg-emerald-500/15 text-emerald-700",
  invoice: "bg-blue-500/15 text-blue-700",
  lead: "bg-violet-500/15 text-violet-700",
  proposal: "bg-amber-500/15 text-amber-700",
  project: "bg-slate-500/15 text-slate-700",
  task: "bg-orange-500/15 text-orange-700",
};

function avatarInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function humanTitle(ev: DashboardOverview["activity"][number]) {
  if (ev.title) return ev.title;
  const actor = ev.actor_name ?? "Someone";
  const entity = ev.entity_name;
  switch (ev.icon) {
    case "payment":
      return entity ? `Payment received · ${entity}` : "Payment received";
    case "invoice":
      return entity ? `Invoice sent · ${entity}` : "Invoice sent";
    case "proposal":
      return `${actor} created proposal${entity ? ` · ${entity}` : ""}`;
    case "lead":
      return entity ? `New lead · ${entity}` : "New lead captured";
    case "project":
      return entity ? `Project update · ${entity}` : "Project updated";
    default:
      return ev.entity_name ?? ev.message;
  }
}

type Props = { data?: DashboardOverview; isLoading?: boolean };

export function ActivityFeedWidget({ data, isLoading }: Props) {
  const events = data?.activity ?? [];

  return (
    <DashboardCard title="Activity feed" description="Business timeline">
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Activity appears as your team works in the OS.</p>
      ) : (
        <ul className="space-y-0">
          {events.map((ev, idx) => {
            const Icon = ICONS[ev.icon] ?? GitCommit;
            const color = ICON_COLORS[ev.icon] ?? "bg-muted text-muted-foreground";
            const title = humanTitle(ev);
            const inner = (
              <div className="flex gap-3 py-3 group">
                <div className="relative shrink-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold ${color}`}>
                    {ev.actor_name ? avatarInitials(ev.actor_name) : <Icon className="h-4 w-4" />}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center ${color} ring-2 ring-card`}>
                    <Icon className="h-2.5 w-2.5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 border-b border-border/60 pb-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors leading-snug">
                        {title}
                      </p>
                      {ev.message && ev.message !== title && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{ev.message}</p>
                      )}
                    </div>
                    {ev.amount_cents != null && ev.amount_cents > 0 && (
                      <span className="text-xs font-semibold text-emerald-700 shrink-0 tabular-nums">
                        {formatCompactInr(ev.amount_cents)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {ev.created_at ? formatRelativeTime(String(ev.created_at)) : ""}
                    {ev.actor_name && !title.includes(ev.actor_name) && ` · ${ev.actor_name}`}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={ev.id ?? idx}>
                {ev.href ? (
                  <Link to={ev.href} className="block hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
