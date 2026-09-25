import { Fragment, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CANNED_REPLIES, FAQ_SUGGESTIONS } from "../inbox.constants";
import type { InboxConversation, InboxMessage, TeamMember } from "../inbox.types";
import {
  avatarTint,
  conversationCompany,
  conversationDisplayName,
  formatMessageTime,
  groupMessages,
  isAiActive,
  liveStatus,
  participantInitials,
  relativeTime,
  senderLabel,
  sourceLabel,
} from "../inbox.utils";

type Props = {
  conversation: InboxConversation | null;
  messages: InboxMessage[];
  team: TeamMember[];
  loading?: boolean;
  sending?: boolean;
  suggestion?: string | null;
  suggesting?: boolean;
  onSend: (text: string) => void;
  onTakeover: () => void;
  onRelease: () => void;
  onClose: () => void;
  onAssign: (userId: string, name: string) => void;
  onSuggest: () => void;
  onInsertSuggestion: (text: string) => void;
};

function GroupBubbles({ group, senderName }: { group: ReturnType<typeof groupMessages>[number]; senderName?: string }) {
  // Incoming = website visitor ("user") or portal client ("client").
  const incoming = group.sender === "user" || group.sender === "client";
  const isAi = group.sender === "ai";
  const isAgent = group.sender === "agent";
  return (
    <div className={cn("flex gap-2", incoming ? "justify-start" : "justify-end")}>
      {incoming && (
        <span className="mt-5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
          {senderName ? senderName.slice(0, 2).toUpperCase() : <UserRound className="h-3 w-3" />}
        </span>
      )}
      <div className={cn("max-w-[74%] space-y-1", !incoming && "flex flex-col items-end")}>
        <div className="text-[10px] text-muted-foreground">
          {group.sender === "client" && senderName ? senderName : senderLabel(group.sender)} · {formatMessageTime(group.time)}
        </div>
        {group.messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "inline-block whitespace-pre-wrap break-words px-3 py-2 text-sm leading-snug shadow-sm",
              // Client / visitor → white card
              incoming && "rounded-2xl rounded-tl-md border border-border bg-white text-foreground",
              // AI → grey
              isAi && "rounded-2xl rounded-tr-md bg-slate-100 text-slate-800",
              // Agent (you) → black
              isAgent && "rounded-2xl rounded-tr-md bg-primary text-primary-foreground",
            )}
          >
            {m.message}
          </div>
        ))}
      </div>
      {isAi && (
        <span className="mt-5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200">
          <Bot className="h-3 w-3 text-slate-600" />
        </span>
      )}
    </div>
  );
}

function TimelineDivider({ label, time }: { label: string; time?: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] text-muted-foreground">
        {label}
        {time ? ` · ${formatMessageTime(time)}` : ""}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function ChatPanel({
  conversation,
  messages,
  team,
  loading,
  sending,
  suggestion,
  suggesting,
  onSend,
  onTakeover,
  onRelease,
  onClose,
  onAssign,
  onSuggest,
  onInsertSuggestion,
}: Props) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    setDraft("");
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/20 p-8 text-center">
        <Sparkles className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Select a conversation</p>
        <p className="mt-1 text-xs text-muted-foreground">Pick a chat from the left to respond</p>
      </div>
    );
  }

  const name = conversationDisplayName(conversation);
  const company = conversationCompany(conversation);
  const role = conversation.participant?.role;
  const projectName = conversation.project?.name || conversation.project_name;
  const status = liveStatus(conversation);
  const aiActive = isAiActive(conversation);
  const closed = conversation.status === "closed";
  const groups = groupMessages(messages);
  let humanJoinedShown = false;

  function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              avatarTint(name),
            )}
          >
            {participantInitials(conversation)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{name}</span>
              <span
                className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[10px] font-medium", status.chip)}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {role && <span>{role}</span>}
              {role && company && <span>·</span>}
              {company && <span className="truncate">{company}</span>}
              {(role || company) && <span>·</span>}
              <span>{conversation.source === "portal" ? "Client Portal" : sourceLabel(conversation.source)}</span>
              {projectName && (
                <>
                  <span>·</span>
                  <span className="truncate">{projectName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Floating actions */}
        {!closed && (
          <div className="flex shrink-0 items-center gap-1.5">
            {aiActive ? (
              <Button size="sm" onClick={onTakeover}>
                Take over
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onRelease}>
                Resume AI
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Users className="h-3.5 w-3.5" /> Transfer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 w-48 overflow-y-auto">
                <DropdownMenuLabel className="text-[11px] uppercase text-muted-foreground">
                  Assign to
                </DropdownMenuLabel>
                {team.length === 0 && (
                  <DropdownMenuItem disabled>No team members</DropdownMenuItem>
                )}
                {team.map((m) => (
                  <DropdownMenuItem
                    key={m.user_id}
                    onClick={() => onAssign(m.user_id, m.name || m.email || "Agent")}
                  >
                    {m.name || m.email || m.user_id}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            <TimelineDivider label="Conversation started" time={conversation.started_at ?? conversation.createdAt} />
            {groups.map((g) => {
              const showJoin = g.sender === "agent" && !humanJoinedShown;
              if (showJoin) humanJoinedShown = true;
              return (
                <Fragment key={g.messages[0].id}>
                  {showJoin && <TimelineDivider label="🟢 Human joined" time={g.time} />}
                  <GroupBubbles group={g} senderName={g.sender === "client" ? name : undefined} />
                </Fragment>
              );
            })}
            {closed && <TimelineDivider label="Conversation closed" time={conversation.ended_at ?? undefined} />}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sticky composer */}
      {!closed && (
        <div className="border-t border-border bg-background p-3 space-y-2">
          {(suggestion || suggesting) && (
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase text-primary">Suggested reply</span>
                {suggestion && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => {
                      setDraft(suggestion);
                      onInsertSuggestion(suggestion);
                    }}
                  >
                    Insert
                  </Button>
                )}
              </div>
              {suggesting ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-xs text-muted-foreground">{suggestion}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {FAQ_SUGGESTIONS.map((f) => (
              <button
                key={f}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                onClick={() => setDraft((d) => (d ? `${d} ${f}?` : `Here's our ${f.toLowerCase()} information: `))}
              >
                {f}
              </button>
            ))}
            <button
              className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/5"
              onClick={onSuggest}
              disabled={suggesting}
            >
              ✨ AI suggest
            </button>
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Type a reply…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              className="min-h-[60px] resize-none"
            />
            <Button size="icon" className="shrink-0 self-end" onClick={handleSend} disabled={!draft.trim() || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Canned responses</summary>
            <div className="mt-1 flex flex-col gap-1">
              {CANNED_REPLIES.map((r) => (
                <button
                  key={r}
                  className="rounded border border-border px-2 py-1 text-left text-[11px] hover:bg-muted"
                  onClick={() => setDraft(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
