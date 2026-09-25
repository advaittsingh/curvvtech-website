import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox as InboxIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/app/providers";
import { useToast } from "@/hooks/use-toast";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { ConversationList } from "../components/ConversationList";
import { ChatPanel } from "../components/ChatPanel";
import { CustomerProfilePanel } from "../components/CustomerProfilePanel";
import { useInboxSocket } from "../hooks/useInboxSocket";
import { INBOX_UNREAD_QUERY_KEY } from "../hooks/useInboxUnreadCount";
import type { InboxConversation, InboxFilter, InboxMessage, TeamMember } from "../inbox.types";

const LIST_KEY = ["admin", "inbox", "list"] as const;

export default function InboxPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const { data: listData, isLoading: listLoading, error: listError } = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => api.chats.list({ limit: 150 }),
    refetchInterval: 15_000,
  });

  const conversations: InboxConversation[] = Array.isArray(listData) ? listData : [];

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "inbox", "detail", selectedId],
    queryFn: () => api.chats.get(selectedId!),
    enabled: Boolean(selectedId),
  });

  const { data: teamData } = useQuery({
    queryKey: ["admin", "team", "members"],
    queryFn: () => api.team.members(),
  });
  const team: TeamMember[] = Array.isArray(teamData) ? teamData : [];

  const messages: InboxMessage[] = useMemo(() => {
    const raw = detail?.messages;
    return Array.isArray(raw) ? raw : [];
  }, [detail]);

  const selected = detail as InboxConversation | undefined;

  const invalidateList = () => {
    qc.invalidateQueries({ queryKey: LIST_KEY });
    qc.invalidateQueries({ queryKey: INBOX_UNREAD_QUERY_KEY });
  };
  const invalidateDetail = () => {
    if (selectedId) qc.invalidateQueries({ queryKey: ["admin", "inbox", "detail", selectedId] });
  };

  const onSocketMessage = useCallback(() => {
    invalidateList();
    invalidateDetail();
  }, [selectedId]);

  useInboxSocket(selectedId, onSocketMessage);

  useEffect(() => {
    if (!selectedId) return;
    api.chats.markRead(selectedId).then(() => invalidateList()).catch(() => {});
  }, [selectedId, messages.length]);

  const send = useMutation({
    mutationFn: (text: string) => api.chats.sendMessage(selectedId!, text),
    onSuccess: () => {
      invalidateDetail();
      invalidateList();
    },
    onError: (e) => toast({ title: "Send failed", description: (e as Error).message, variant: "destructive" }),
  });

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.chats.update(selectedId!, body),
    onSuccess: () => {
      invalidateDetail();
      invalidateList();
    },
    onError: (e) => toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" }),
  });

  const suggest = useMutation({
    mutationFn: () => api.chats.suggestReply(selectedId!),
    onSuccess: (res: { suggestion?: string }) => setSuggestion(res.suggestion ?? null),
  });

  const summarize = useMutation({
    mutationFn: () => api.chats.summarize(selectedId!),
    onSuccess: () => {
      invalidateDetail();
      toast({ title: "Summary generated" });
    },
  });

  const convertLead = useMutation({
    mutationFn: () => api.chats.convertToLead(selectedId!),
    onSuccess: (res: { lead_id?: string }) => {
      invalidateDetail();
      toast({ title: "Lead created", description: res.lead_id ? `Lead ${res.lead_id}` : undefined });
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const name = selected?.lead?.name || selected?.lead_name || "Chat visitor";
      return api.tasks.create({
        title: `Follow up: ${name}`,
        description: selected?.summary?.gist || selected?.last_message || "Website chat follow-up",
        priority: selected?.metadata?.priority === "high" ? "high" : "medium",
        due_at: new Date(Date.now() + 86400000).toISOString(),
      });
    },
    onSuccess: () => toast({ title: "Task created" }),
  });

  const createProposal = useMutation({
    mutationFn: async () => {
      const leadId = selected?.metadata?.lead_id;
      if (leadId) return api.leads.generateProposal(String(leadId));
      const conv = await api.chats.convertToLead(selectedId!);
      if (conv.lead_id) return api.leads.generateProposal(conv.lead_id);
      throw new Error("Could not create lead for proposal");
    },
    onSuccess: (res: { id?: string }) => {
      toast({ title: "Proposal created" });
      if (res?.id) navigate(`/proposals/${res.id}`);
    },
  });

  function handleSelect(id: string) {
    setSelectedId(id);
    setSuggestion(null);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
        <InboxIcon className="h-5 w-5" />
        <div>
          <h1 className="text-base font-semibold">Inbox</h1>
          <p className="text-xs text-muted-foreground">Website & client conversations — respond in real time</p>
        </div>
        {!listLoading && (
          <span className="ml-auto text-xs text-muted-foreground">{conversations.length} conversations</span>
        )}
      </div>

      <BackendErrorAlert error={listError} />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[22%_53%_25%]">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          filter={filter}
          search={search}
          myUserId={user?.id}
          onSelect={handleSelect}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
        />

        <ChatPanel
          conversation={selected ?? null}
          messages={messages}
          team={team}
          loading={detailLoading && Boolean(selectedId)}
          sending={send.isPending}
          suggestion={suggestion}
          suggesting={suggest.isPending}
          onSend={(text) => send.mutate(text)}
          onTakeover={() => patch.mutate({ agent_takeover: true })}
          onRelease={() => patch.mutate({ release_to_ai: true })}
          onClose={() => patch.mutate({ status: "closed" })}
          onAssign={(userId, name) => patch.mutate({ assignee_id: userId, assignee_name: name })}
          onSuggest={() => suggest.mutate()}
          onInsertSuggestion={(text) => {
            setSuggestion(text);
          }}
        />

        <CustomerProfilePanel
          conversation={selected ?? null}
          team={team}
          summarizing={summarize.isPending}
          converting={convertLead.isPending}
          onUpdate={(patchBody) => patch.mutate(patchBody)}
          onSummarize={() => summarize.mutate()}
          onConvertLead={() => convertLead.mutate()}
          onCreateTask={() => createTask.mutate()}
          onCreateProposal={() => createProposal.mutate()}
        />
      </div>
    </div>
  );
}
