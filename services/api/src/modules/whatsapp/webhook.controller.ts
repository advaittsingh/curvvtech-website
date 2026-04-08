import type { Request, Response } from "express";
import { config } from "../../config.js";
import { verifyWhatsAppSignature } from "../../services/whatsappMetaVerify.js";
import { parseWhatsAppWebhook } from "./webhook.parser.js";
import { processWebhookPayload } from "./webhook.service.js";

export function verifyWebhookGet(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!config.whatsappWebhookVerifyToken) {
    return res.status(503).type("text/plain").send("WHATSAPP_WEBHOOK_VERIFY_TOKEN not configured");
  }

  if (mode === "subscribe" && typeof token === "string" && token === config.whatsappWebhookVerifyToken) {
    return res.status(200).type("text/plain").send(String(challenge ?? ""));
  }

  return res.sendStatus(403);
}

export async function handleWebhookPost(req: Request, res: Response) {
  const body = req.body as Record<string, unknown> | null | undefined;
  const entryLen = Array.isArray(body?.entry) ? body.entry.length : 0;
  req.log?.info(
    {
      event: "whatsapp_webhook_post_received",
      object: typeof body?.object === "string" ? body.object : undefined,
      entryCount: entryLen,
      contentLength: req.get("content-length"),
      hasRawBody: !!(req.rawBody && req.rawBody.length > 0),
      userAgent: req.get("user-agent"),
    },
    "WhatsApp webhook POST received"
  );

  const sigRequired =
    config.nodeEnv === "production" && config.requireWhatsappSignatureInProduction;

  if (sigRequired && !config.whatsappAppSecret) {
    req.log?.error(
      { event: "whatsapp_webhook_config_error" },
      "WHATSAPP_APP_SECRET required when REQUIRE_WHATSAPP_SIGNATURE is enabled — Meta cannot deliver signed webhooks"
    );
    return res.status(503).json({ error: "Webhook signing not configured" });
  }

  if (sigRequired && config.whatsappAppSecret) {
    const sig = req.get("x-hub-signature-256");
    if (!verifyWhatsAppSignature(req.rawBody ?? Buffer.alloc(0), sig, config.whatsappAppSecret)) {
      req.log?.warn(
        { event: "whatsapp_webhook_bad_signature", hasSigHeader: Boolean(sig) },
        "WhatsApp webhook signature verification failed — check WHATSAPP_APP_SECRET matches Meta App → Basic"
      );
      return res.sendStatus(403);
    }
  }

  const parsed = parseWhatsAppWebhook(req.body);
  req.log?.info(
    {
      event: "whatsapp_webhook_parsed",
      inboundMessages: parsed.inbound.length,
      statusUpdates: parsed.statuses.length,
    },
    "WhatsApp webhook payload parsed"
  );

  if (entryLen > 0 && parsed.inbound.length === 0 && parsed.statuses.length === 0) {
    req.log?.warn(
      { event: "whatsapp_webhook_empty_parse", entryCount: entryLen },
      "Webhook had entry[] but no messages/statuses extracted — check Meta payload shape vs parser"
    );
  }

  try {
    await processWebhookPayload(parsed, req.log);
    return res.sendStatus(200);
  } catch (e) {
    req.log?.error({ err: e }, "whatsapp webhook processing failed");
    return res.sendStatus(200);
  }
}
