import { randomUUID } from "node:crypto";
import { sql } from "../../lib/sqlPool.js";

export type ConversationRow = {
  id: string;
  visitor_id: string;
  status: string;
  source: string;
  agent_clerk_id: string | null;
  client_id?: string | null;
  project_id?: string | null;
  organization_id?: string | null;
  ip_address: string | null;
  country: string | null;
  pages_visited: string[];
  metadata: object;
  started_at: Date;
  ended_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender: string;
  message: string;
  agent_clerk_id: string | null;
  metadata: object;
  createdAt: Date;
};

export async function createConversation(params: {
  visitor_id: string;
  ip_address?: string;
  country?: string;
  pages_visited?: string[];
}): Promise<ConversationRow> {
  const rows = (await sql`
    INSERT INTO conversations (visitor_id, ip_address, country, pages_visited)
    VALUES (${params.visitor_id}, ${params.ip_address ?? null}, ${params.country ?? null}, ${params.pages_visited ?? []})
    RETURNING *
  `) as ConversationRow[];
  return rows[0]!;
}

export async function getConversation(id: string): Promise<ConversationRow | null> {
  const rows = (await sql`SELECT * FROM conversations WHERE id = ${id}::uuid`) as ConversationRow[];
  return rows[0] ?? null;
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessageRow[]> {
  const rows = await sql`
    SELECT id, conversation_id, sender, message, agent_clerk_id, metadata, "createdAt"
    FROM chat_messages WHERE conversation_id = ${conversationId}::uuid ORDER BY "createdAt" ASC
  `;
  return rows as ChatMessageRow[];
}

export async function addMessage(params: {
  conversation_id: string;
  sender: "ai" | "user" | "agent";
  message: string;
  agent_clerk_id?: string | null;
}): Promise<ChatMessageRow> {
  const rows = (await sql`
    INSERT INTO chat_messages (conversation_id, sender, message, agent_clerk_id)
    VALUES (${params.conversation_id}::uuid, ${params.sender}, ${params.message}, ${params.agent_clerk_id ?? null})
    RETURNING *
  `) as ChatMessageRow[];
  return rows[0]!;
}

export async function updateConversation(
  id: string,
  updates: { status?: string; agent_clerk_id?: string | null; ended_at?: Date | null }
): Promise<void> {
  if (updates.status !== undefined) {
    await sql`UPDATE conversations SET status = ${updates.status}, "updatedAt" = NOW() WHERE id = ${id}::uuid`;
  }
  if (updates.agent_clerk_id !== undefined) {
    await sql`UPDATE conversations SET agent_clerk_id = ${updates.agent_clerk_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`;
  }
  if (updates.ended_at !== undefined) {
    await sql`UPDATE conversations SET ended_at = ${updates.ended_at}, "updatedAt" = NOW() WHERE id = ${id}::uuid`;
  }
}

export async function saveSummary(params: {
  conversation_id: string;
  gist: string;
  lead_type?: string;
  business?: string;
  budget?: string;
  timeline?: string;
  interest_level?: string;
  extracted_contact?: object;
}): Promise<void> {
  await sql`
    INSERT INTO conversation_summaries (conversation_id, gist, lead_type, business, budget, timeline, interest_level, extracted_contact)
    VALUES (${params.conversation_id}::uuid, ${params.gist}, ${params.lead_type ?? null}, ${params.business ?? null}, ${params.budget ?? null}, ${params.timeline ?? null}, ${params.interest_level ?? null}, ${params.extracted_contact ? JSON.stringify(params.extracted_contact) : null})
    ON CONFLICT (conversation_id) DO UPDATE SET
      gist = EXCLUDED.gist, lead_type = EXCLUDED.lead_type, business = EXCLUDED.business,
      budget = EXCLUDED.budget, timeline = EXCLUDED.timeline, interest_level = EXCLUDED.interest_level,
      extracted_contact = EXCLUDED.extracted_contact
  `;
}

export type ConversationListRow = ConversationRow & {
  last_message: string | null;
  last_message_at: Date | null;
  last_sender: string | null;
  message_count: number;
  unread_count: number;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  client_company: string | null;
  client_user_name: string | null;
  project_name: string | null;
  gist: string | null;
};

export async function listConversationsForAdmin(params: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ConversationListRow[]> {
  const limit = Math.min(params.limit ?? 100, 200);
  const offset = params.offset ?? 0;
  const status = params.status ?? null;
  // NOTE: the `sql` helper does not support nested template fragments — a value
  // is always bound as a `$n` parameter. Use a null-tolerant filter instead of a
  // conditional `WHERE` fragment (which would bind a Promise and break the query).
  const rows = await sql`
    SELECT
      c.*,
      lm.message AS last_message,
      lm."createdAt" AS last_message_at,
      lm.sender AS last_sender,
      COALESCE(mc.total, 0)::int AS message_count,
      COALESCE(uc.unread, 0)::int AS unread_count,
      COALESCE(cu.name, cl.name, cli.name) AS lead_name,
      COALESCE(cl.email, cli.email) AS lead_email,
      COALESCE(cl.phone, cli.phone) AS lead_phone,
      cli.company AS client_company,
      cu.name AS client_user_name,
      proj.name AS project_name,
      cs.gist AS gist
    FROM conversations c
    LEFT JOIN LATERAL (
      SELECT message, sender, "createdAt"
      FROM chat_messages m WHERE m.conversation_id = c.id
      ORDER BY m."createdAt" DESC LIMIT 1
    ) lm ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total FROM chat_messages m WHERE m.conversation_id = c.id
    ) mc ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS unread FROM chat_messages m
      WHERE m.conversation_id = c.id
        AND m.sender <> 'agent'
        AND m."createdAt" > COALESCE((c.metadata->>'admin_last_read_at')::timestamptz, 'epoch'::timestamptz)
    ) uc ON TRUE
    LEFT JOIN chat_leads cl ON cl.conversation_id = c.id
    LEFT JOIN clients cli ON cli.id = c.client_id
    LEFT JOIN client_users cu ON c.source = 'portal' AND cu.id::text = split_part(c.visitor_id, ':', 2)
    LEFT JOIN projects proj ON proj.id = c.project_id
    LEFT JOIN conversation_summaries cs ON cs.conversation_id = c.id
    WHERE (${status}::text IS NULL OR c.status = ${status})
    ORDER BY c."updatedAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows as ConversationListRow[];
}

/** Shallow-merge a partial object into the conversation's metadata JSONB. */
export async function mergeConversationMetadata(id: string, patch: Record<string, unknown>): Promise<void> {
  await sql`
    UPDATE conversations
    SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb,
        "updatedAt" = NOW()
    WHERE id = ${id}::uuid
  `;
}

/** Mark all inbound messages as read by the admin (stamps metadata.admin_last_read_at). */
export async function markConversationRead(id: string): Promise<void> {
  await mergeConversationMetadata(id, { admin_last_read_at: new Date().toISOString() });
}

export type InternalNote = { id: string; author: string; author_name?: string; text: string; at: string };

/** Append an internal note to metadata.notes (never shown to the customer). */
export async function addInternalNote(id: string, note: Omit<InternalNote, "id" | "at">): Promise<InternalNote> {
  const entry: InternalNote = {
    id: randomUUID(),
    at: new Date().toISOString(),
    ...note,
  };
  await sql`
    UPDATE conversations
    SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{notes}',
          COALESCE(metadata->'notes', '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb,
          true
        ),
        "updatedAt" = NOW()
    WHERE id = ${id}::uuid
  `;
  return entry;
}

export async function upsertChatLead(params: {
  conversation_id: string;
  email?: string;
  phone?: string;
  name?: string;
  business?: string;
  project_type?: string;
  budget?: string;
  timeline?: string;
}): Promise<void> {
  await sql`
    INSERT INTO chat_leads (conversation_id, email, phone, name, business, project_type, budget, timeline)
    VALUES (${params.conversation_id}::uuid, ${params.email ?? null}, ${params.phone ?? null}, ${params.name ?? null}, ${params.business ?? null}, ${params.project_type ?? null}, ${params.budget ?? null}, ${params.timeline ?? null})
    ON CONFLICT (conversation_id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, chat_leads.email),
      phone = COALESCE(EXCLUDED.phone, chat_leads.phone),
      name = COALESCE(EXCLUDED.name, chat_leads.name),
      business = COALESCE(EXCLUDED.business, chat_leads.business),
      project_type = COALESCE(EXCLUDED.project_type, chat_leads.project_type),
      budget = COALESCE(EXCLUDED.budget, chat_leads.budget),
      timeline = COALESCE(EXCLUDED.timeline, chat_leads.timeline)
  `;
}
