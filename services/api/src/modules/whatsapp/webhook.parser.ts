import { z } from "zod";
import { normalizeWhatsAppPhoneNumberId } from "./phoneNumberId.js";

/** Loose Zod pass over Meta payload; unknown shapes yield empty arrays. */
const MetaTextBody = z.object({ body: z.string().optional() });
const MetaMessage = z.object({
  from: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.string().optional(),
  type: z.string().optional(),
  text: MetaTextBody.optional(),
  image: z.object({ id: z.string().optional(), caption: z.string().optional() }).optional(),
  document: z.object({ id: z.string().optional(), caption: z.string().optional() }).optional(),
});

const MetaStatus = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  timestamp: z.string().optional(),
  recipient_id: z.string().optional(),
});

const phoneNumberIdFromMeta = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    return normalizeWhatsAppPhoneNumberId(v) ?? undefined;
  });

const MetaValue = z.object({
  metadata: z.object({ phone_number_id: phoneNumberIdFromMeta }).optional(),
  messages: z.array(MetaMessage).optional(),
  statuses: z.array(MetaStatus).optional(),
  contacts: z
    .array(z.object({ wa_id: z.string().optional(), profile: z.object({ name: z.string().optional() }).optional() }))
    .optional(),
});

const MetaChange = z.object({ value: MetaValue.optional() });
const MetaEntry = z.object({ changes: z.array(MetaChange).optional() });
const WebhookBody = z.object({ entry: z.array(MetaEntry).optional() });

export type InboundParsed = {
  phoneNumberId: string;
  customerWaId: string;
  customerName?: string;
  messageId: string;
  timestampSec: number;
  messageType: "text" | "image" | "document" | "audio" | "video" | "unknown";
  body: string;
  mediaId?: string;
  rawMessage: Record<string, unknown>;
};

export type StatusParsed = {
  phoneNumberId: string;
  waMessageId: string;
  status: string;
  timestampSec: number;
};

export type ParseResult = { inbound: InboundParsed[]; statuses: StatusParsed[] };

export function parseWhatsAppWebhook(body: unknown): ParseResult {
  const parsed = WebhookBody.safeParse(body);
  if (!parsed.success) {
    return { inbound: [], statuses: [] };
  }

  const inbound: InboundParsed[] = [];
  const statuses: StatusParsed[] = [];

  for (const ent of parsed.data.entry ?? []) {
    for (const ch of ent.changes ?? []) {
      const value = ch.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const nameByWa = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c.wa_id && c.profile?.name) nameByWa.set(c.wa_id, c.profile.name);
      }

      for (const msg of value.messages ?? []) {
        const id = msg.id;
        const from = msg.from;
        if (!id || !from) continue;
        const ts = Number.parseInt(String(msg.timestamp || "0"), 10) || Math.floor(Date.now() / 1000);
        const type = (msg.type || "text").toLowerCase();
        let messageType: InboundParsed["messageType"] = "unknown";
        let bodyText = "";
        let mediaId: string | undefined;

        if (type === "text" && msg.text?.body) {
          messageType = "text";
          bodyText = msg.text.body;
        } else if (type === "image" && msg.image) {
          messageType = "image";
          bodyText = msg.image.caption || "";
          mediaId = msg.image.id;
        } else if (type === "document" && msg.document) {
          messageType = "document";
          bodyText = msg.document.caption || "";
          mediaId = msg.document.id;
        } else if (type === "audio" && (msg as { audio?: { id?: string } }).audio?.id) {
          messageType = "audio";
          mediaId = (msg as { audio?: { id?: string } }).audio?.id;
        } else if (type === "video" && (msg as { video?: { id?: string } }).video?.id) {
          messageType = "video";
          mediaId = (msg as { video?: { id?: string } }).video?.id;
        }

        inbound.push({
          phoneNumberId,
          customerWaId: from,
          customerName: nameByWa.get(from),
          messageId: id,
          timestampSec: ts,
          messageType,
          body: bodyText,
          mediaId,
          rawMessage: msg as Record<string, unknown>,
        });
      }

      for (const st of value.statuses ?? []) {
        const mid = st.id;
        const stStatus = st.status;
        if (!mid || !stStatus) continue;
        const ts = Number.parseInt(String(st.timestamp || "0"), 10) || Math.floor(Date.now() / 1000);
        statuses.push({
          phoneNumberId,
          waMessageId: mid,
          status: stStatus,
          timestampSec: ts,
        });
      }
    }
  }

  return { inbound, statuses };
}
