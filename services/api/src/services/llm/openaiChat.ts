import OpenAI from "openai";
import { config } from "../../config.js";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

let client: OpenAI | null = null;
function getClient() {
  if (!client) {
    if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY is required");
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

export async function chatComplete(params: {
  messages: ChatMsg[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const c = getClient();
  const model = params.model || process.env.AI_CALL_OPENAI_MODEL || "gpt-4o-mini";
  const r = await c.chat.completions.create({
    model,
    messages: params.messages,
    temperature: params.temperature ?? 0.4,
    max_tokens: params.maxTokens ?? 220,
  });
  return r.choices[0]?.message?.content?.trim() || "";
}

