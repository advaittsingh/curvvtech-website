import { pool } from "../../db.js";
import { notFound, badRequest } from "../../lib/errors.js";
import { assertQuota } from "../billing/planUsage.js";
import {
  repoGetConversation,
  repoGetPhoneNumberIdForTenant,
  repoInsertBusinessMessage,
  repoListConversations,
  repoListMessages,
  repoMarkConversationRead,
} from "./inbox.repository.js";
import { sendWhatsAppText } from "../whatsapp/send.service.js";

export async function listConversations(tenantId: string, limit: number, cursor?: string | null) {
  const rows = await repoListConversations(pool, tenantId, { limit, cursor: cursor ?? undefined });
  return {
    conversations: rows.map((r) => ({
      id: r.id,
      customer_wa_id: r.customer_wa_id,
      customer_phone_e164: r.customer_phone_e164,
      last_message_preview: r.last_message.slice(0, 280),
      last_message_at: r.last_message_at.toISOString(),
      unread_count: r.unread_count,
      assigned_to_user_id: r.assigned_to_user_id,
    })),
    next_cursor: rows.length === limit ? rows[rows.length - 1]!.id : null,
  };
}

export async function getConversation(tenantId: string, conversationId: string) {
  const row = await repoGetConversation(pool, tenantId, conversationId);
  if (!row) throw notFound("Conversation not found");
  return {
    id: row.id,
    customer_wa_id: row.customer_wa_id,
    customer_phone_e164: row.customer_phone_e164,
    last_message_preview: row.last_message.slice(0, 500),
    last_message_at: row.last_message_at.toISOString(),
    unread_count: row.unread_count,
    assigned_to_user_id: row.assigned_to_user_id,
  };
}

export async function listMessages(tenantId: string, conversationId: string, limit: number, before?: string | null) {
  const conv = await repoGetConversation(pool, tenantId, conversationId);
  if (!conv) throw notFound("Conversation not found");
  const rows = await repoListMessages(pool, tenantId, conversationId, { limit, before: before ?? undefined });
  return {
    messages: rows.map((m) => ({
      id: m.id,
      wa_message_id: m.wa_message_id,
      sender: m.sender,
      body: m.body,
      message_type: m.message_type,
      media_id: m.media_id,
      delivery_status: m.delivery_status,
      created_at: m.created_at.toISOString(),
    })),
    next_before: rows.length === limit ? rows[0]!.id : null,
  };
}

export async function sendMessage(
  tenantId: string,
  conversationId: string,
  body: { type: string; text?: string }
): Promise<{ ok: boolean; wa_message_id?: string; error?: string }> {
  if (body.type !== "text") throw badRequest("Only type=text supported in this version");
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) throw badRequest("text is required");

  const conv = await repoGetConversation(pool, tenantId, conversationId);
  if (!conv) throw notFound("Conversation not found");

  await assertQuota(pool, conv.user_id, "follow_up_message");

  const phoneNumberId = await repoGetPhoneNumberIdForTenant(pool, tenantId);
  if (!phoneNumberId) throw badRequest("No WhatsApp line connected for this organization");

  const sent = await sendWhatsAppText({
    phoneNumberId,
    to: conv.customer_wa_id,
    body: text,
  });

  if (!sent.ok || !sent.waMessageId) {
    return { ok: false, error: sent.error ?? "send failed" };
  }

  await repoInsertBusinessMessage(pool, {
    conversationId,
    waMessageId: sent.waMessageId,
    body: text,
    messageType: "text",
  });

  await pool.query(
    `UPDATE wa_conversations SET last_message = $1, last_message_at = now() WHERE id = $2::uuid`,
    [text, conversationId]
  );

  return { ok: true, wa_message_id: sent.waMessageId };
}

export async function markRead(tenantId: string, conversationId: string) {
  const conv = await repoGetConversation(pool, tenantId, conversationId);
  if (!conv) throw notFound("Conversation not found");
  await repoMarkConversationRead(pool, tenantId, conversationId);
}
