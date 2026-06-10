import axios from "axios";
import { api } from "./api";

export type TenantRow = { id: string; name: string; slug: string; role: string };

export type InboxConversation = {
  id: string;
  customer_wa_id: string;
  customer_phone_e164: string | null;
  last_message_preview: string;
  last_message_at: string;
  unread_count: number;
  assigned_to_user_id: string | null;
  /** When backend caches WA profile / display name from webhooks */
  customer_profile_name?: string | null;
  customer_avatar_url?: string | null;
};

export type InboxMessage = {
  id: string;
  wa_message_id: string;
  sender: string;
  body: string;
  message_type: string;
  media_id: string | null;
  delivery_status: string;
  created_at: string;
};

function tenantHeaders(tenantId: string) {
  return { "X-Tenant-Id": tenantId };
}

export async function fetchTenants(): Promise<TenantRow[]> {
  const { data } = await api.get<{ tenants: TenantRow[] }>("/v1/tenants");
  return data.tenants;
}

export async function fetchInboxConversations(
  tenantId: string,
  opts?: { limit?: number; cursor?: string }
): Promise<{ conversations: InboxConversation[]; next_cursor: string | null }> {
  const { data } = await api.get<{ conversations: InboxConversation[]; next_cursor: string | null }>(
    "/v1/inbox/conversations",
    {
      params: {
        limit: opts?.limit ?? 30,
        ...(opts?.cursor ? { cursor: opts.cursor } : {}),
      },
      headers: tenantHeaders(tenantId),
    }
  );
  return data;
}

export async function fetchInboxMessages(
  tenantId: string,
  conversationId: string,
  opts?: { limit?: number; before?: string }
): Promise<{ messages: InboxMessage[]; next_before: string | null }> {
  const { data } = await api.get<{ messages: InboxMessage[]; next_before: string | null }>(
    `/v1/inbox/conversations/${conversationId}/messages`,
    {
      params: {
        limit: opts?.limit ?? 50,
        ...(opts?.before ? { before: opts.before } : {}),
      },
      headers: tenantHeaders(tenantId),
    }
  );
  return data;
}

export async function sendInboxTextMessage(
  tenantId: string,
  conversationId: string,
  text: string
): Promise<{ wa_message_id: string }> {
  const { data } = await api.post<{ wa_message_id: string }>(
    `/v1/inbox/conversations/${conversationId}/messages`,
    { type: "text", text },
    { headers: tenantHeaders(tenantId) }
  );
  return data;
}

export async function markInboxConversationRead(tenantId: string, conversationId: string): Promise<void> {
  await api.post(`/v1/inbox/conversations/${conversationId}/read`, {}, { headers: tenantHeaders(tenantId) });
}

function errMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as { message?: string; error?: string } | undefined;
    const serverMsg = d?.message || d?.error || "";
    const lowerServerMsg = serverMsg.toLowerCase();

    if (
      lowerServerMsg.includes("error validating access token") ||
      lowerServerMsg.includes("graph api 401")
    ) {
      return "WhatsApp send failed because the Graph token expired. Update WHATSAPP_GRAPH_ACCESS_TOKEN on the server and retry.";
    }

    if (e.response?.status === 404 && !serverMsg) {
      return "Conversation not found. Refresh inbox and try again.";
    }

    if (d?.message) return d.message;
    if (d?.error) return d.error;
    return e.message || "Request failed";
  }
  return e instanceof Error ? e.message : "Request failed";
}

export function inboxErrorMessage(e: unknown): string {
  return errMessage(e);
}
