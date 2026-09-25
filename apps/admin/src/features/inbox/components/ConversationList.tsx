import { Building2, Globe, MessageSquare, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { INBOX_FILTERS } from "../inbox.constants";
import type { InboxConversation, InboxFilter } from "../inbox.types";
import {
  avatarTint,
  computeLeadScore,
  conversationCompany,
  conversationDisplayName,
  conversationSubtitle,
  filterCounts,
  liveStatus,
  matchesFilter,
  matchesSearch,
  participantInitials,
  participantType,
  relativeTime,
  sourceLabel,
} from "../inbox.utils";

const FILTER_TONES: Partial<Record<InboxFilter, string>> = {
  ai_active: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  waiting: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  assigned: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  high: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
};
const FILTER_DOTS: Partial<Record<InboxFilter, string>> = {
  ai_active: "bg-emerald-500",
  waiting: "bg-red-500",
  assigned: "bg-blue-500",
  high: "bg-rose-500",
};

type Props = {
  conversations: InboxConversation[];
  selectedId: string | null;
  filter: InboxFilter;
  search: string;
  myUserId?: string;
  onSelect: (id: string) => void;
  onFilterChange: (f: InboxFilter) => void;
  onSearchChange: (q: string) => void;
};

export function ConversationList({
  conversations,
  selectedId,
  filter,
  search,
  myUserId,
  onSelect,
  onFilterChange,
  onSearchChange,
}: Props) {
  const counts = filterCounts(conversations, myUserId);
  const filtered = conversations.filter((c) => matchesFilter(c, filter, myUserId) && matchesSearch(c, search));

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, company…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {INBOX_FILTERS.map((f) => {
            const count = counts[f.id];
            const active = filter === f.id;
            const tone = FILTER_TONES[f.id];
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : tone
                      ? tone
                      : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {!active && FILTER_DOTS[f.id] && (
                  <span className={cn("h-1.5 w-1.5 rounded-full", FILTER_DOTS[f.id])} />
                )}
                {f.label}
                {count > 0 && f.id !== "all" && (
                  <span className={cn("tabular-nums", active ? "opacity-80" : "opacity-70")}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No conversations match.</p>
        ) : (
          <ul>
            {filtered.map((c) => {
              const name = conversationDisplayName(c);
              const company = conversationCompany(c);
              const project = c.project?.name || c.project_name;
              const status = liveStatus(c);
              const unread = (c.unread_count ?? 0) > 0;
              const priority = c.metadata?.priority;
              const assignee = c.metadata?.assignee_name;
              const isPortal = c.source === "portal";
              const ptype = participantType(c);
              const score = computeLeadScore(c);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "relative flex w-full items-start gap-3 border-b border-border py-3 pl-3 pr-3 text-left transition-colors hover:bg-muted/50",
                      selectedId === c.id && "bg-muted",
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold",
                          avatarTint(name),
                        )}
                      >
                        {participantInitials(c)}
                      </span>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                          status.dot,
                        )}
                        title={status.label}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            unread ? "font-bold text-foreground" : "font-semibold text-foreground",
                          )}
                        >
                          {name}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {relativeTime(c.last_message_at ?? c.updatedAt)}
                        </span>
                      </div>

                      {(company || project) && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[company, project].filter(Boolean).join(" · ")}
                        </p>
                      )}

                      {c.last_message && (
                        <p className={cn("mt-1 truncate text-xs", unread ? "text-foreground/90" : "text-muted-foreground/90")}>
                          {c.last_sender === "user" || c.last_sender === "client" ? "" : c.last_sender === "ai" ? "AI: " : "You: "}
                          {c.last_message}
                        </p>
                      )}

                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className={cn("gap-1 px-1.5 py-0 text-[9px]", status.chip)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                          {status.label}
                        </Badge>
                        <Badge variant="outline" className="gap-0.5 px-1 py-0 text-[9px]">
                          {isPortal ? <UserRound className="h-2.5 w-2.5" /> : ptype === "lead" ? <Building2 className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                          {isPortal ? "Client Portal" : sourceLabel(c.source)}
                        </Badge>
                        {priority && priority !== "normal" && (
                          <Badge
                            variant="outline"
                            className="px-1 py-0 text-[9px] border-rose-200 bg-rose-50 capitalize text-rose-700"
                          >
                            {priority}
                          </Badge>
                        )}
                        {ptype === "lead" && score.tone === "hot" && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px] border-amber-200 bg-amber-50 text-amber-700">
                            🔥 {score.score}
                          </Badge>
                        )}
                      </div>
                      {assignee && <p className="mt-1 text-[10px] text-muted-foreground">Assigned: {assignee}</p>}
                    </div>

                    {unread && (
                      <span className="absolute right-3 top-11 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                        {c.unread_count}
                      </span>
                    )}
                    {!c.last_message && !unread && (
                      <MessageSquare className="absolute right-3 top-11 h-3 w-3 text-muted-foreground/40" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
