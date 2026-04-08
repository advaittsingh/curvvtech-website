import type pg from "pg";

export type ConversationRow = {
  id: string;
  user_id: string;
  customer_wa_id: string;
  customer_phone_e164: string | null;
  last_message: string;
  last_message_at: Date;
  unread_count: number;
  assigned_to_user_id: string | null;
};

export type MessageRow = {
  id: string;
  wa_message_id: string;
  sender: string;
  body: string;
  message_type: string;
  media_id: string | null;
  delivery_status: string;
  created_at: Date;
};

export async function repoListConversations(
  db: pg.Pool,
  tenantId: string,
  opts: { limit: number; cursor?: string | null }
): Promise<ConversationRow[]> {
  const limit = Math.min(Math.max(opts.limit, 1), 100);
  if (opts.cursor) {
    const r = await db.query<ConversationRow>(
      `SELECT id::text, user_id::text, customer_wa_id, customer_phone_e164, last_message, last_message_at, unread_count,
              assigned_to_user_id::text
       FROM wa_conversations
       WHERE tenant_id = $1::uuid AND (last_message_at, id::text) < (
         SELECT last_message_at, id::text FROM wa_conversations WHERE id = $2::uuid AND tenant_id = $1::uuid
       )
       ORDER BY last_message_at DESC, id DESC
       LIMIT $3`,
      [tenantId, opts.cursor, limit]
    );
    return r.rows;
  }
  const r = await db.query<ConversationRow>(
    `SELECT id::text, user_id::text, customer_wa_id, customer_phone_e164, last_message, last_message_at, unread_count,
            assigned_to_user_id::text
     FROM wa_conversations
     WHERE tenant_id = $1::uuid
     ORDER BY last_message_at DESC, id DESC
     LIMIT $2`,
    [tenantId, limit]
  );
  return r.rows;
}

export async function repoGetConversation(
  db: pg.Pool,
  tenantId: string,
  conversationId: string
): Promise<ConversationRow | null> {
  const r = await db.query<ConversationRow>(
    `SELECT id::text, user_id::text, customer_wa_id, customer_phone_e164, last_message, last_message_at, unread_count,
            assigned_to_user_id::text
     FROM wa_conversations
     WHERE tenant_id = $1::uuid AND id = $2::uuid`,
    [tenantId, conversationId]
  );
  return r.rows[0] ?? null;
}

export async function repoListMessages(
  db: pg.Pool,
  tenantId: string,
  conversationId: string,
  opts: { limit: number; before?: string | null }
): Promise<MessageRow[]> {
  const limit = Math.min(Math.max(opts.limit, 1), 200);
  if (opts.before) {
    const r = await db.query<MessageRow>(
      `SELECT m.id::text, m.wa_message_id, m.sender, m.body, m.message_type, m.media_id, m.delivery_status, m.created_at
       FROM wa_messages m
       JOIN wa_conversations c ON c.id = m.conversation_id
       WHERE c.tenant_id = $1::uuid AND m.conversation_id = $2::uuid
         AND (m.created_at, m.id::text) < (
           SELECT created_at, id::text FROM wa_messages
           WHERE id = $3::uuid AND conversation_id = $2::uuid
         )
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT $4`,
      [tenantId, conversationId, opts.before, limit]
    );
    return r.rows.reverse();
  }
  const r = await db.query<MessageRow>(
    `SELECT m.id::text, m.wa_message_id, m.sender, m.body, m.message_type, m.media_id, m.delivery_status, m.created_at
     FROM wa_messages m
     JOIN wa_conversations c ON c.id = m.conversation_id
     WHERE c.tenant_id = $1::uuid AND m.conversation_id = $2::uuid
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT $3`,
    [tenantId, conversationId, limit]
  );
  return r.rows.reverse();
}

export async function repoInsertBusinessMessage(
  db: pg.Pool,
  params: {
    conversationId: string;
    waMessageId: string;
    body: string;
    messageType: string;
  }
): Promise<void> {
  await db.query(
    `INSERT INTO wa_messages (conversation_id, wa_message_id, sender, body, created_at, message_type, delivery_status)
     VALUES ($1::uuid, $2, 'business', $3, now(), $4, 'sent')`,
    [params.conversationId, params.waMessageId, params.body, params.messageType]
  );
}

export async function repoMarkConversationRead(db: pg.Pool, tenantId: string, conversationId: string): Promise<void> {
  await db.query(
    `UPDATE wa_conversations SET unread_count = 0 WHERE tenant_id = $1::uuid AND id = $2::uuid`,
    [tenantId, conversationId]
  );
}

export async function repoGetPhoneNumberIdForTenant(db: pg.Pool, tenantId: string): Promise<string | null> {
  const r = await db.query<{ phone_number_id: string }>(
    `SELECT phone_number_id FROM whatsapp_accounts WHERE tenant_id = $1::uuid ORDER BY created_at ASC LIMIT 1`,
    [tenantId]
  );
  return r.rows[0]?.phone_number_id ?? null;
}
