import { pool } from "../db.js";
import { notFound } from "../lib/errors.js";
import { repoListMessages } from "../modules/inbox/inbox.repository.js";
import { getOpenAIClient } from "./openaiClient.js";

function formatTranscript(lines: { sender: string; body: string }[]): string {
  return lines
    .map((m) => {
      const who = m.sender === "customer" ? "Customer" : "Business";
      const body = (m.body || "").trim() || "(no text)";
      return `${who}: ${body}`;
    })
    .join("\n");
}

async function loadWaTranscript(tenantId: string, conversationId: string): Promise<string> {
  const rows = await repoListMessages(pool, tenantId, conversationId, { limit: 120 });
  const msgs = rows.map((r) => ({ sender: r.sender, body: r.body }));
  return formatTranscript(msgs);
}

async function resolveWaLead(tenantId: string, leadId: string) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(leadId)) {
    throw notFound("Lead not found");
  }

  // Primary lookup: WA lead id.
  const byLeadId = await pool.query<{
    id: string;
    conversation_id: string;
    summary: string;
    follow_up_text: string;
  }>(
    `SELECT id::text, conversation_id::text, summary, follow_up_text
     FROM wa_leads
     WHERE id = $1::uuid AND tenant_id = $2::uuid`,
    [leadId, tenantId]
  );
  if (byLeadId.rows[0]) return byLeadId.rows[0];

  // Compatibility fallback: some clients may send conversation_id instead of lead id.
  const byConversationId = await pool.query<{
    id: string;
    conversation_id: string;
    summary: string;
    follow_up_text: string;
  }>(
    `SELECT id::text, conversation_id::text, summary, follow_up_text
     FROM wa_leads
     WHERE conversation_id = $1::uuid AND tenant_id = $2::uuid`,
    [leadId, tenantId]
  );
  if (!byConversationId.rows[0]) throw notFound("Lead not found");
  return byConversationId.rows[0];
}

export type LeadInsightsResult = {
  business_summary: string;
  suggestions: string[];
  ai_enabled: boolean;
};

export async function generateWaLeadInsights(tenantId: string, leadId: string): Promise<LeadInsightsResult> {
  const lead = await resolveWaLead(tenantId, leadId);
  const transcript = await loadWaTranscript(tenantId, lead.conversation_id);
  const client = getOpenAIClient();
  if (!client) {
    return {
      business_summary: lead.summary?.trim() || "No summary yet.",
      suggestions: [],
      ai_enabled: false,
    };
  }

  const system = `You help small business owners understand WhatsApp sales chats. Reply with JSON only, no markdown.
Schema: {"business_summary": string, "suggestions": string[]}
- business_summary: 2-4 sentences on what the customer wants, their situation, and what the business should focus on.
- suggestions: exactly 4 short, actionable bullet strings (max 120 chars each) for the owner to move the deal forward.`;

  const user = `WhatsApp conversation (most recent messages may be at the end):\n\n${transcript || "(no messages yet)"}\n\nCRM summary (may be incomplete): ${lead.summary || "n/a"}\nSuggested follow-up hint from system: ${lead.follow_up_text || "n/a"}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user.slice(0, 100_000) },
      ],
      max_tokens: 900,
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw) as { business_summary?: unknown; suggestions?: unknown };
    const business_summary =
      typeof parsed.business_summary === "string" && parsed.business_summary.trim()
        ? parsed.business_summary.trim()
        : lead.summary?.trim() || "No summary yet.";
    const sugRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions = sugRaw
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 6);
    return { business_summary, suggestions, ai_enabled: true };
  } catch (e) {
    console.error("generateWaLeadInsights", e);
    return {
      business_summary: lead.summary?.trim() || "Could not generate a fresh summary right now.",
      suggestions: [],
      ai_enabled: false,
    };
  }
}

export async function generateWaFollowUpDraft(tenantId: string, leadId: string): Promise<{ text: string; ai_enabled: boolean }> {
  const lead = await resolveWaLead(tenantId, leadId);
  const transcript = await loadWaTranscript(tenantId, lead.conversation_id);
  const client = getOpenAIClient();
  if (!client) {
    return { text: lead.follow_up_text?.trim() || "Hi — following up on our conversation. Let me know if you have any questions.", ai_enabled: false };
  }

  const system =
    "You write short WhatsApp messages for a business. Reply with plain text only. No quotes. Max 3 sentences. Friendly, professional tone.";

  const user = `Draft a follow-up message to the customer based on this thread:\n\n${transcript || "(no messages)"}\n\nContext: ${lead.summary || ""}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user.slice(0, 100_000) },
      ],
      max_tokens: 300,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "";
    return { text: text || "Hi — just checking in. Happy to help!", ai_enabled: true };
  } catch (e) {
    console.error("generateWaFollowUpDraft", e);
    return { text: lead.follow_up_text?.trim() || "Hi — following up on our chat.", ai_enabled: false };
  }
}

export async function generateManualLeadInsights(userId: string, leadId: number): Promise<LeadInsightsResult> {
  const r = await pool.query<{
    contact_name: string;
    raw_text: string;
    summary: string;
  }>(
    `SELECT contact_name, raw_text, summary FROM leads WHERE id = $1 AND user_id = $2::uuid`,
    [leadId, userId]
  );
  if (!r.rows[0]) throw notFound("Lead not found");
  const row = r.rows[0];
  const client = getOpenAIClient();
  if (!client) {
    return {
      business_summary: row.summary?.trim() || "No summary yet.",
      suggestions: [],
      ai_enabled: false,
    };
  }

  const system = `You help small business owners. Reply with JSON only, no markdown.
Schema: {"business_summary": string, "suggestions": string[]}
- business_summary: 2-4 sentences on what this lead is about.
- suggestions: exactly 4 short actionable strings for follow-up (max 120 chars each).`;

  const user = `Lead name: ${row.contact_name}\n\nPasted conversation or notes:\n${row.raw_text.slice(0, 50_000)}\n\nExisting summary: ${row.summary || "n/a"}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 900,
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw) as { business_summary?: unknown; suggestions?: unknown };
    const business_summary =
      typeof parsed.business_summary === "string" && parsed.business_summary.trim()
        ? parsed.business_summary.trim()
        : row.summary?.trim() || "No summary yet.";
    const sugRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions = sugRaw
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 6);
    return { business_summary, suggestions, ai_enabled: true };
  } catch (e) {
    console.error("generateManualLeadInsights", e);
    return {
      business_summary: row.summary?.trim() || "Could not generate insights right now.",
      suggestions: [],
      ai_enabled: false,
    };
  }
}

export async function generateManualFollowUpDraft(userId: string, leadId: number): Promise<{ text: string; ai_enabled: boolean }> {
  const r = await pool.query<{
    raw_text: string;
    summary: string;
    contact_name: string;
  }>(`SELECT raw_text, summary, contact_name FROM leads WHERE id = $1 AND user_id = $2::uuid`, [leadId, userId]);
  if (!r.rows[0]) throw notFound("Lead not found");
  const row = r.rows[0];
  const client = getOpenAIClient();
  if (!client) {
    return {
      text: `Hi ${row.contact_name.split(/\s+/)[0] || "there"} — following up on your message. Let me know if you’d like to continue the conversation.`,
      ai_enabled: false,
    };
  }

  const system =
    "You write short WhatsApp/SMS-style follow-ups for a business. Plain text only. Max 3 sentences. No quotes.";

  const user = `Draft a follow-up to ${row.contact_name}.\n\nContext:\n${row.raw_text.slice(0, 50_000)}\n\nSummary: ${row.summary || "n/a"}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 300,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "";
    return { text: text || "Hi — just checking in!", ai_enabled: true };
  } catch (e) {
    console.error("generateManualFollowUpDraft", e);
    return { text: "Hi — following up on our conversation. Let me know if you have any questions.", ai_enabled: false };
  }
}
