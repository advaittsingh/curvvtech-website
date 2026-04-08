import { pool } from "../../db.js";
import { sendWhatsAppText } from "../whatsapp/send.service.js";

/** Evaluate enabled rules for tenant after inbound customer text (extensible JSON trigger/action). */
export async function runInboundAutomations(params: {
  tenantId: string;
  phoneNumberId: string;
  customerWaId: string;
  text: string;
}): Promise<void> {
  const { tenantId, phoneNumberId, customerWaId, text } = params;
  const lower = text.toLowerCase().trim();

  const rules = await pool.query<{
    id: string;
    trigger: unknown;
  }>(
    `SELECT id::text, trigger FROM automation_rules
     WHERE tenant_id = $1 AND enabled = true
     ORDER BY priority DESC, created_at ASC`,
    [tenantId]
  );

  for (const rule of rules.rows) {
    const t = rule.trigger as { type?: string; keyword?: string; match?: string };
    if (t?.type !== "keyword" || typeof t.keyword !== "string") continue;
    if (!lower.includes(t.keyword.toLowerCase())) continue;

    const actions = await pool.query<{ action: unknown; step_order: number }>(
      `SELECT action, step_order FROM automation_actions WHERE rule_id = $1::uuid ORDER BY step_order ASC`,
      [rule.id]
    );

    for (const row of actions.rows) {
      const a = row.action as { type?: string; text?: string };
      if (a?.type === "auto_reply" && typeof a.text === "string" && a.text.trim()) {
        await sendWhatsAppText({
          phoneNumberId,
          to: customerWaId,
          body: a.text.trim(),
        });
      }
      /* Future: tag_lead, assign_agent, etc. */
    }
  }
}
