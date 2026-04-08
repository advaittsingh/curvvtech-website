/**
 * @deprecated Webhook processing lives in `modules/whatsapp/webhook.service.ts`.
 * Kept for any legacy imports; delegates to the new parser + service.
 */
import { parseWhatsAppWebhook } from "../modules/whatsapp/webhook.parser.js";
import { processWebhookPayload } from "../modules/whatsapp/webhook.service.js";

export async function processWhatsAppWebhookPayload(body: unknown): Promise<void> {
  const parsed = parseWhatsAppWebhook(body);
  await processWebhookPayload(parsed);
}
