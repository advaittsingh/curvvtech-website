export function getChatApiBase(): string {
  return String(
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || ""
  ).replace(/\/$/, "");
}

/** API host for Socket.IO (no trailing `/api`). */
export function getChatSocketUrl(): string {
  const base = getChatApiBase().replace(/\/api\/?$/i, "");
  try {
    return new URL(base).origin;
  } catch {
    return base;
  }
}

export type Conversation = {
  id: string;
  visitor_id: string;
  status: string;
  source: string;
  agent_clerk_id: string | null;
  started_at: string;
  ended_at: string | null;
  messages?: ChatMessage[];
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender: "ai" | "user" | "agent";
  message: string;
  agent_clerk_id: string | null;
  createdAt: string;
};

export async function createConversation(params: {
  visitor_id: string;
  pages_visited?: string[];
}): Promise<Conversation> {
  const BASE = getChatApiBase();
  const res = await fetch(`${BASE}/api/chat/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getConversation(
  id: string
): Promise<Conversation & { messages: ChatMessage[] }> {
  const BASE = getChatApiBase();
  const res = await fetch(`${BASE}/api/chat/conversations/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendMessage(
  conversationId: string,
  message: string
): Promise<{ messages: ChatMessage[]; escalated?: boolean }> {
  const BASE = getChatApiBase();
  const res = await fetch(`${BASE}/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function closeConversation(conversationId: string): Promise<void> {
  const BASE = getChatApiBase();
  const res = await fetch(`${BASE}/api/chat/conversations/${conversationId}/close`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getWhatsAppUrl(topic?: string): Promise<string> {
  const BASE = getChatApiBase();
  const u = new URL(`${BASE}/api/chat/whatsapp-url`);
  if (topic) u.searchParams.set("topic", topic);
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { url: string };
  return data.url;
}
