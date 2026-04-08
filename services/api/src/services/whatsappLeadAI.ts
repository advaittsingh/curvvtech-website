import { pool } from "../db.js";
import { AppError } from "../lib/errors.js";
import { assertQuota } from "../modules/billing/planUsage.js";
import { getOpenAIClient } from "./openaiClient.js";

export type WaLeadClassification = {
  is_lead: boolean;
  intent: string;
  stage: "new" | "interested" | "negotiating" | "closed" | "not_lead";
  score: number;
  summary: string;
  follow_up: string;
};

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeStage(s: string): WaLeadClassification["stage"] {
  const x = String(s || "").toLowerCase();
  if (x === "interested") return "interested";
  if (x === "negotiating") return "negotiating";
  if (x === "closed") return "closed";
  if (x === "not_lead" || x === "not lead") return "not_lead";
  return "new";
}

/** Load last N messages for a conversation (chronological). */
export async function loadConversationLines(conversationId: string, limit = 10): Promise<string[]> {
  const r = await pool.query<{ sender: string; body: string; created_at: Date }>(
    `SELECT sender, body, created_at FROM wa_messages
     WHERE conversation_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [conversationId, limit]
  );
  const rows = r.rows.reverse();
  return rows.map((m) => `${m.sender === "customer" ? "Customer" : "Business"}: ${m.body}`);
}

export async function classifyWhatsAppConversation(
  conversationId: string
): Promise<WaLeadClassification | null> {
  const lines = await loadConversationLines(conversationId, 10);
  if (lines.length === 0) return null;

  const client = getOpenAIClient();
  const conversation = lines.join("\n");

  const defaultResult: WaLeadClassification = {
    is_lead: true,
    intent: "unknown",
    stage: "new",
    score: 50,
    summary: lines[lines.length - 1]?.slice(0, 500) || "",
    follow_up: "Follow up with the customer.",
  };

  if (!client) {
    return defaultResult;
  }

  const system = `Analyze this WhatsApp thread and return JSON only with keys:
is_lead (boolean),
intent (short string),
stage (one of: new, interested, negotiating, closed, not_lead),
score (0-100 integer),
summary (one paragraph),
follow_up (suggested next message or action for the business).`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Conversation:\n${conversation}` },
      ],
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const is_lead = Boolean(parsed.is_lead);
    const intent = typeof parsed.intent === "string" ? parsed.intent : "unknown";
    const stage = normalizeStage(typeof parsed.stage === "string" ? parsed.stage : "new");
    const score = clampScore(Number(parsed.score));
    const summary = typeof parsed.summary === "string" ? parsed.summary : defaultResult.summary;
    const follow_up = typeof parsed.follow_up === "string" ? parsed.follow_up : defaultResult.follow_up;

    return { is_lead, intent, stage, score, summary, follow_up };
  } catch (e) {
    console.error("whatsappLeadAI classify error", e);
    return defaultResult;
  }
}

export async function upsertWaLead(
  conversationId: string,
  c: WaLeadClassification,
  tenantId: string
): Promise<void> {
  const exists = await pool.query(`SELECT 1 FROM wa_leads WHERE conversation_id = $1::uuid LIMIT 1`, [
    conversationId,
  ]);
  if (!exists.rowCount) {
    const ur = await pool.query<{ user_id: string }>(
      `SELECT user_id::text FROM wa_conversations WHERE id = $1::uuid LIMIT 1`,
      [conversationId]
    );
    const uid = ur.rows[0]?.user_id;
    if (uid) {
      try {
        await assertQuota(pool, uid, "lead");
      } catch (e) {
        if (e instanceof AppError && e.status === 403) {
          return;
        }
        throw e;
      }
    }
  }

  const status = c.is_lead ? c.stage : "not_lead";
  await pool.query(
    `INSERT INTO wa_leads (conversation_id, tenant_id, status, score, summary, follow_up_text, updated_at)
     VALUES ($1, $2::uuid, $3, $4, $5, $6, now())
     ON CONFLICT (conversation_id) DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       status = EXCLUDED.status,
       score = EXCLUDED.score,
       summary = EXCLUDED.summary,
       follow_up_text = EXCLUDED.follow_up_text,
       updated_at = now()`,
    [conversationId, tenantId, status, c.score, c.summary, c.follow_up]
  );
}
