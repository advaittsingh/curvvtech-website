import OpenAI from "openai";
import { config } from "../config.js";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const key = config.openaiApiKey;
  if (!key) return null;
  if (!_client) {
    _client = new OpenAI({ apiKey: key, timeout: 60_000 });
  }
  return _client;
}

export async function askAI(message: string): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ],
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("OpenAI Error:", err);
    throw new Error("AI request failed");
  }
}
