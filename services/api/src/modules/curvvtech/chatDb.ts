import { sql } from "../../lib/sqlPool.js";

export type ConversationRow = {
  id: string;
  visitor_id: string;
  status: string;
  source: string;
  agent_clerk_id: string | null;
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

export async function listConversationsForAdmin(params: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ConversationRow[]> {
  const limit = Math.min(params.limit ?? 50, 100);
  const offset = params.offset ?? 0;
  if (params.status) {
    const rows = await sql`
      SELECT * FROM conversations WHERE status = ${params.status}
      ORDER BY "updatedAt" DESC LIMIT ${limit} OFFSET ${offset}
    `;
    return rows as ConversationRow[];
  }
  const rows = await sql`
    SELECT * FROM conversations ORDER BY "updatedAt" DESC LIMIT ${limit} OFFSET ${offset}
  `;
  return rows as ConversationRow[];
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
