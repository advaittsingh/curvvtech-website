import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/session";
import { adminApi } from "@/lib/api";
import { chatSocketUrl } from "@/lib/backend-url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  escalated: "bg-amber-100 text-amber-800",
  closed: "bg-stone-100 text-stone-600",
};

function metricValue(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** True if this Socket.IO payload is a chat row for the open conversation (loose check). */
function socketPayloadMatchesConversation(raw: unknown, conversationId: string): boolean {
  if (!raw || typeof raw !== "object") return false;
  const cid = (raw as { conversation_id?: unknown }).conversation_id;
  if (typeof cid !== "string") return false;
  return cid.trim().toLowerCase() === conversationId.trim().toLowerCase();
}

export default function ChatDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const statusFilterRef = useRef(statusFilter);
  statusFilterRef.current = statusFilter;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = chatSocketUrl();
    if (!url) return;

    const socket = io(url, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const joinSelectedRoom = () => {
      const id = selectedIdRef.current;
      if (id) socket.emit("join_conversation", id.trim());
    };

    socket.on("connect", joinSelectedRoom);

    socket.on("chat_message", (raw: unknown) => {
      const id = selectedIdRef.current;
      if (!id) return;
      if (!socketPayloadMatchesConversation(raw, id)) return;

      // Refetch (not only invalidate) so data updates even with staleTime: Infinity.
      void queryClient.refetchQueries({ queryKey: ["admin", "chats", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "chats", "analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "chats", statusFilterRef.current] });
    });

    return () => {
      socket.off("connect", joinSelectedRoom);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    if (!s.connected) return;
    if (selectedId) {
      s.emit("join_conversation", selectedId.trim());
    } else {
      s.emit("leave_conversations");
    }
  }, [selectedId]);

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["admin", "chats", statusFilter],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).chats.list(statusFilter || undefined);
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin", "chats", "analytics"],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).chats.analytics();
    },
  });

  const { data: selected, isLoading: loadingSelected } = useQuery({
    queryKey: ["admin", "chats", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const token = getAccessToken();
      return adminApi(token).chats.get(selectedId);
    },
    enabled: !!selectedId,
    // Fallback when Socket.IO misses (background tab, proxy, event-name quirks).
    refetchInterval: (q) => (q.state.data !== undefined ? 3500 : false),
    refetchIntervalInBackground: true,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const token = getAccessToken();
      return adminApi(token).chats.sendMessage(id, message);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "chats", id] });
    },
  });

  const takeOverMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = getAccessToken();
      return adminApi(token).chats.update(id, { agent_takeover: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "chats"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "chats", selectedId] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = getAccessToken();
      return adminApi(token).chats.update(id, { status: "closed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "chats"] });
      setSelectedId(null);
    },
  });

  const sendTranscriptMutation = useMutation({
    mutationFn: async ({ id, phone }: { id: string; phone: string }) => {
      const token = getAccessToken();
      return adminApi(token).chats.sendTranscriptWhatsApp(id, phone);
    },
  });

  const conversations = Array.isArray(list) ? list : [];

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <h2 className="text-lg font-semibold text-stone-900 mb-6">Chat dashboard</h2>

      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-stone-200">
            <CardContent className="p-4">
              <p className="text-xs text-stone-500">Chats today</p>
              <p className="text-xl font-semibold">{metricValue(analytics.chats_today)}</p>
            </CardContent>
          </Card>
          <Card className="border-stone-200">
            <CardContent className="p-4">
              <p className="text-xs text-stone-500">AI resolved</p>
              <p className="text-xl font-semibold">{metricValue(analytics.ai_resolved)}</p>
            </CardContent>
          </Card>
          <Card className="border-stone-200">
            <CardContent className="p-4">
              <p className="text-xs text-stone-500">Human takeover</p>
              <p className="text-xl font-semibold">{metricValue(analytics.human_takeover)}</p>
            </CardContent>
          </Card>
          <Card className="border-stone-200">
            <CardContent className="p-4">
              <p className="text-xs text-stone-500">Leads generated</p>
              <p className="text-xl font-semibold">{metricValue(analytics.leads_generated)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-stone-200">
          <CardHeader className="border-b border-stone-200 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Conversations</CardTitle>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-stone-200 rounded px-2 py-1"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="escalated">Escalated</option>
              <option value="closed">Closed</option>
            </select>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            {isLoading && <p className="p-4 text-stone-500">Loading…</p>}
            <BackendErrorAlert error={error} />
            {conversations.length === 0 && !isLoading && (
              <p className="p-4 text-stone-500">No conversations.</p>
            )}
            <ul className="divide-y divide-stone-100">
              {conversations.map((c: { id: string; visitor_id: string; status: string; started_at: string }) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-stone-50 ${selectedId === c.id ? "bg-stone-100" : ""}`}
                  >
                    <span className="font-medium text-stone-800 truncate block">{c.visitor_id}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={statusColors[c.status] ?? "bg-stone-100 text-stone-600"}>
                        {c.status}
                      </Badge>
                      <span className="text-xs text-stone-400">
                        {new Date(c.started_at).toLocaleString()}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-stone-200">
          <CardHeader className="border-b border-stone-200">
            <CardTitle className="text-base">
              {selectedId ? "Chat" : "Select a conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {!selectedId && (
              <p className="text-stone-500">Select a conversation from the list.</p>
            )}
            {selectedId && loadingSelected && <p className="text-stone-500">Loading…</p>}
            {selected && (
              <>
                <div className="mb-4 p-3 bg-stone-50 rounded-lg text-sm">
                  <p><strong>Visitor:</strong> {selected.visitor_id}</p>
                  <p><strong>Status:</strong> {selected.status}</p>
                  {selected.ip_address && <p><strong>IP:</strong> {selected.ip_address}</p>}
                  {selected.summary && (
                    <p><strong>Summary:</strong> {selected.summary.gist}</p>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 mb-4 p-2 border border-stone-200 rounded">
                  {(selected.messages || []).map((m: { id: string; sender: string; message: string; createdAt: string }) => (
                    <div
                      key={m.id}
                      className={`text-sm p-2 rounded ${m.sender === "user" ? "bg-blue-50 ml-8" : m.sender === "agent" ? "bg-amber-50 mr-8" : "bg-stone-100"}`}
                    >
                      <span className="font-medium">{m.sender}:</span> {m.message}
                      <span className="text-xs text-stone-400 block">{new Date(m.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
                {selected.status !== "closed" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Reply…"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (replyText.trim()) {
                              sendMessageMutation.mutate({ id: selected.id, message: replyText.trim() });
                              setReplyText("");
                            }
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          if (replyText.trim()) {
                            sendMessageMutation.mutate({ id: selected.id, message: replyText.trim() });
                            setReplyText("");
                          }
                        }}
                        disabled={!replyText.trim() || sendMessageMutation.isPending}
                      >
                        Send
                      </Button>
                    </div>
                    {!selected.agent_clerk_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => takeOverMutation.mutate(selected.id)}
                        disabled={takeOverMutation.isPending}
                      >
                        Take over chat
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closeMutation.mutate(selected.id)}
                      disabled={closeMutation.isPending}
                    >
                      Mark resolved
                    </Button>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-stone-200">
                  <p className="text-sm font-medium mb-2">Send transcript to WhatsApp</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Phone number"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (whatsappPhone.trim()) {
                          sendTranscriptMutation.mutate({ id: selected.id, phone: whatsappPhone.trim() });
                        }
                      }}
                      disabled={!whatsappPhone.trim() || sendTranscriptMutation.isPending}
                    >
                      Send
                    </Button>
                  </div>
                  {sendTranscriptMutation.isError && (
                    <p className="text-red-600 text-sm mt-1">Failed to send.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
