import { getOpenAIClient } from "./openaiClient.js";

export function intentToStatus(intent: string): string {
  const n = String(intent || "").toLowerCase();
  if (n === "hot") return "hot";
  if (n === "cold") return "closed";
  return "follow-up";
}

const MAX_CHAT_CHARS = 50_000;

export async function extractLeadFromChat(chatText: string): Promise<{
  contact_name: string;
  summary: string;
  status: string;
}> {
  if (chatText.length > MAX_CHAT_CHARS) {
    throw new Error("Text too long");
  }

  const client = getOpenAIClient();
  if (!client) {
    return {
      contact_name: "Unknown",
      summary: chatText.slice(0, 200).trim() || "(no summary)",
      status: "follow-up",
    };
  }

  const system =
    "You extract structured data from customer chats. Reply with JSON only: keys name (string or null), summary (string, what they want), intent (one of: hot, warm, cold). hot = ready to buy soon, warm = interested, cold = low interest.";

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `From this conversation:\n\n${chatText}` },
      ],
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const name =
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim()
        : "Unknown";
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : chatText.slice(0, 200).trim() || "(no summary)";
    const status = intentToStatus(typeof parsed.intent === "string" ? parsed.intent : "");
    return { contact_name: name, summary, status };
  } catch (err) {
    console.error("OpenAI parse error:", err);
    return {
      contact_name: "Unknown",
      summary: chatText.slice(0, 200).trim() || "(no summary)",
      status: "follow-up",
    };
  }
}
