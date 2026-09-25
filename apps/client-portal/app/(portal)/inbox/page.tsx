"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Send, Paperclip } from "lucide-react";
import { api, API_BASE, getSession } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import {
  PageHeader,
  Card,
  Avatar,
  Btn,
  relativeTime,
  Breadcrumbs,
} from "@/components/ui";
import { nameFromEmail } from "@/components/project/useProjectWorkspace";

type Conversation = { id: string; status: string; channel: string; updated_at: string };
type Message = { id: string; sender: string; message: string; created_at: string };

export default function InboxPage() {
  const { primaryProject, team } = useWorkspace();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const pm = team[0];
  const pmName = pm ? nameFromEmail(pm.email) : "Your team";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await api<{ conversations: Conversation[] }>("/conversations");
      let id = r.conversations[0]?.id;
      if (!id) {
        const created = await api<{ id: string }>("/conversations", {
          method: "POST",
          body: JSON.stringify({ project_id: primaryProject?.id }),
        });
        id = created.id;
      }
      if (!cancelled) {
        setConversationId(id);
        setReady(true);
      }
    })().catch(() => setReady(true));
    return () => { cancelled = true; };
  }, [primaryProject?.id]);

  useEffect(() => {
    const s = getSession();
    const socket = io(API_BASE, { auth: { token: s?.accessToken }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("chat_message", (msg: Message & { conversation_id: string }) => {
      if (msg.conversation_id === conversationId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.sender !== "client") {
          api(`/conversations/${conversationId}/mark-read`, { method: "POST" }).catch(() => {});
        }
      }
    });
    return () => { socket.disconnect(); };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    api<{ messages: Message[] }>(`/conversations/${conversationId}/messages`).then((r) => setMessages(r.messages));
    api(`/conversations/${conversationId}/mark-read`, { method: "POST" }).catch(() => {});
    socketRef.current?.emit("join_conversation", conversationId);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || !conversationId || sending) return;
    const body = text.trim();
    setText("");
    setSending(true);
    try {
      const r = await api<{ message: Message }>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: body }),
      });
      setMessages((prev) => (prev.some((m) => m.id === r.message.id) ? prev : [...prev, r.message]));
    } finally {
      setSending(false);
    }
  }

  const session = getSession();
  const clientName = session?.user?.name || session?.user?.email || "You";

  return (
    <div className="cp-animate flex flex-col h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-8rem)]">
      <Breadcrumbs items={[{ label: "Messages" }]} />
      <PageHeader title="Messages" subtitle="One conversation with your project team — like Intercom, project-aware." />

      <Card className="p-0 flex flex-col overflow-hidden flex-1 min-h-0">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--panel-2)]">
          <Avatar name={pmName} size={40} online />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{pmName}</div>
            <div className="text-xs text-[var(--muted)]">Your project team</div>
          </div>
          {primaryProject && <span className="text-xs text-[var(--muted)] hidden sm:block">{primaryProject.name}</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[var(--bg)]/50">
          {!ready && <div className="text-center text-sm text-[var(--muted)] py-12">Connecting…</div>}
          {ready && messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-sm font-medium">Start the conversation</div>
              <div className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                Ask about progress, request changes, or share feedback. Everything is stored and your team sees it in real time.
              </div>
            </div>
          )}
          {messages.map((m) => {
            const isClient = m.sender === "client";
            const label = isClient ? clientName : m.sender === "ai" ? "AI Assistant" : pmName;
            return (
              <div key={m.id} className={`flex gap-2.5 ${isClient ? "flex-row-reverse" : ""}`}>
                <Avatar name={label} size={34} />
                <div className={`max-w-[80%] ${isClient ? "items-end" : ""}`}>
                  <div className={`text-[11px] font-medium text-[var(--muted)] mb-1 ${isClient ? "text-right" : ""}`}>{label}</div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isClient
                        ? "text-white bg-[var(--brand)] rounded-tr-md"
                        : m.sender === "ai"
                          ? "bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-tl-md"
                          : "bg-[var(--panel)] border border-[var(--border)] rounded-tl-md shadow-sm"
                    }`}
                  >
                    {m.message}
                  </div>
                  <div className={`text-[10px] text-[var(--muted-2)] mt-1 ${isClient ? "text-right" : ""}`}>
                    {relativeTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-[var(--border)] flex gap-2 bg-[var(--panel)]">
          <button type="button" className="p-2.5 rounded-xl text-[var(--muted)] hover:bg-black/[0.04]" title="Attach file (coming soon)">
            <Paperclip size={18} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={`Message ${pmName}…`}
            className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 outline-none focus:border-[var(--brand-accent)] text-sm bg-[var(--panel-2)]"
          />
          <Btn onClick={send} disabled={sending || !text.trim()} className="px-4">
            <Send size={16} />
          </Btn>
        </div>
      </Card>
    </div>
  );
}
