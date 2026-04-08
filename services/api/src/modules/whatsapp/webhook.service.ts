import type { Logger } from "pino";
import { pool } from "../../db.js";
import { classifyWhatsAppConversation, upsertWaLead } from "../../services/whatsappLeadAI.js";
import { runInboundAutomations } from "../automation/automation.service.js";
import { normalizeWhatsAppPhoneNumberId } from "./phoneNumberId.js";
import type { InboundParsed, ParseResult, StatusParsed } from "./webhook.parser.js";

async function resolveTenantAndOwnerUser(
  phoneNumberIdRaw: string,
  log?: Logger
): Promise<{ tenantId: string; userId: string; canonicalPhoneNumberId: string } | null> {
  const phoneNumberId = normalizeWhatsAppPhoneNumberId(phoneNumberIdRaw);
  log?.info(
    {
      event: "whatsapp_webhook_lookup",
      incoming_phone_number_id: phoneNumberIdRaw,
      normalized_phone_number_id: phoneNumberId,
    },
    "Incoming phone_number_id"
  );
  if (!phoneNumberId) {
    log?.warn({ incoming_phone_number_id: phoneNumberIdRaw, reason: "invalid_or_empty" }, "Tenant NOT found");
    return null;
  }

  const acc = await pool.query<{ tenant_id: string; db_phone_number_id: string }>(
    `SELECT tenant_id::text, phone_number_id AS db_phone_number_id
     FROM whatsapp_accounts
     WHERE phone_number_id = $1
        OR trim(phone_number_id) = $1
     LIMIT 1`,
    [phoneNumberId]
  );
  if (!acc.rows[0]?.tenant_id) {
    log?.warn(
      { normalized_phone_number_id: phoneNumberId, reason: "no_whatsapp_accounts_row" },
      "Tenant NOT found"
    );
    return null;
  }

  log?.info(
    {
      event: "whatsapp_tenant_resolved",
      normalized_phone_number_id: phoneNumberId,
      tenant_id: acc.rows[0].tenant_id,
      db_phone_number_id: acc.rows[0].db_phone_number_id,
    },
    "Tenant found"
  );

  const tenantId = acc.rows[0].tenant_id;
  const member = await pool.query<{ user_id: string }>(
    `SELECT user_id::text FROM tenant_users
     WHERE tenant_id = $1::uuid
     ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, created_at ASC
     LIMIT 1`,
    [tenantId]
  );
  const userId = member.rows[0]?.user_id;
  if (!userId) {
    log?.warn({ tenant_id: tenantId }, "whatsapp_webhook_tenant_has_no_members");
    return null;
  }
  return { tenantId, userId, canonicalPhoneNumberId: acc.rows[0].db_phone_number_id };
}

function mapMetaStatus(s: string): string {
  const x = s.toLowerCase();
  if (x === "sent" || x === "delivered" || x === "read" || x === "failed") return x;
  return "received";
}

export async function applyStatusUpdates(items: StatusParsed[]): Promise<void> {
  for (const s of items) {
    const st = mapMetaStatus(s.status);
    await pool.query(
      `UPDATE wa_messages SET delivery_status = $1 WHERE wa_message_id = $2`,
      [st, s.waMessageId]
    );
  }
}

export async function ingestInbound(
  m: InboundParsed,
  log?: Logger
): Promise<{ ok: boolean; reason?: string }> {
  const resolved = await resolveTenantAndOwnerUser(m.phoneNumberId, log);
  if (!resolved) {
    return { ok: true, reason: "unknown_whatsapp_account" };
  }

  const { tenantId, userId, canonicalPhoneNumberId } = resolved;
  const customerPhone = m.customerWaId.startsWith("+") ? m.customerWaId : `+${m.customerWaId}`;

  const conv = await pool.query<{ id: string }>(
    `INSERT INTO wa_conversations (user_id, tenant_id, customer_wa_id, customer_phone_e164, last_message, last_message_at, unread_count)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, to_timestamp($6::double precision), 1)
     ON CONFLICT (tenant_id, customer_wa_id) DO UPDATE SET
       last_message = EXCLUDED.last_message,
       last_message_at = EXCLUDED.last_message_at,
       user_id = EXCLUDED.user_id,
       customer_phone_e164 = COALESCE(wa_conversations.customer_phone_e164, EXCLUDED.customer_phone_e164),
       unread_count = wa_conversations.unread_count + 1
     RETURNING id::text AS id`,
    [userId, tenantId, m.customerWaId, customerPhone, m.body || "[media]", m.timestampSec]
  );
  const conversationId = conv.rows[0]!.id;

  const ins = await pool.query(
    `INSERT INTO wa_messages (conversation_id, wa_message_id, sender, body, created_at, message_type, media_id, raw_payload, delivery_status)
     VALUES ($1::uuid, $2, 'customer', $3, to_timestamp($4::double precision), $5, $6, $7::jsonb, 'received')
     ON CONFLICT (wa_message_id) DO NOTHING
     RETURNING id`,
    [
      conversationId,
      m.messageId,
      m.body,
      m.timestampSec,
      m.messageType,
      m.mediaId ?? null,
      JSON.stringify(m.rawMessage),
    ]
  );

  if (ins.rowCount === 0) {
    return { ok: true, reason: "duplicate" };
  }

  if (m.messageType === "text" && m.body.trim()) {
    try {
      await runInboundAutomations({
        tenantId,
        phoneNumberId: canonicalPhoneNumberId,
        customerWaId: m.customerWaId,
        text: m.body,
      });
    } catch (e) {
      console.error("automation error", e);
    }
  }

  const classification = await classifyWhatsAppConversation(conversationId);
  if (classification) {
    await upsertWaLead(conversationId, classification, tenantId);
  }

  return { ok: true };
}

export async function processWebhookPayload(result: ParseResult, log?: Logger): Promise<void> {
  await applyStatusUpdates(result.statuses);

  for (const m of result.inbound) {
    try {
      const r = await ingestInbound(m, log);
      if (r.reason && r.reason !== "duplicate") {
        log?.info({ reason: r.reason, phoneNumberId: m.phoneNumberId }, "whatsapp_ingest_skip");
      }
    } catch (e) {
      log?.error({ err: e }, "whatsapp ingest error");
      throw e;
    }
  }
}
