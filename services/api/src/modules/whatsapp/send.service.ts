import { config } from "../../config.js";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type SendTextParams = {
  phoneNumberId: string;
  to: string;
  body: string;
};

/** Outbound Cloud API message with exponential backoff on 429/5xx. */
export async function sendWhatsAppText(
  params: SendTextParams
): Promise<{ ok: boolean; waMessageId?: string; error?: string }> {
  const token = config.whatsappGraphAccessToken;
  if (!token) {
    return { ok: false, error: "WHATSAPP_GRAPH_ACCESS_TOKEN not configured" };
  }

  const to = params.to.replace(/^\+/, "");
  const url = `https://graph.facebook.com/v21.0/${params.phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: params.body.slice(0, 4096) },
  };

  let attempt = 0;
  const max = 4;
  let delay = 500;

  while (attempt < max) {
    attempt += 1;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const j = (await res.json()) as { messages?: Array<{ id?: string }> };
        const waMessageId = j.messages?.[0]?.id ?? `local-${Date.now()}`;
        return { ok: true, waMessageId };
      }

      const errText = await res.text();
      if (res.status === 429 || res.status >= 500) {
        await sleep(delay);
        delay = Math.min(delay * 2, 8000);
        continue;
      }

      return { ok: false, error: `Graph API ${res.status}: ${errText.slice(0, 500)}` };
    } catch (e) {
      if (attempt >= max) {
        return { ok: false, error: e instanceof Error ? e.message : "network error" };
      }
      await sleep(delay);
      delay = Math.min(delay * 2, 8000);
    }
  }

  return { ok: false, error: "Max retries exceeded" };
}
