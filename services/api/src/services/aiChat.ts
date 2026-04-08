import OpenAI from "openai";
import { getOpenAIClient } from "./openaiClient.js";

const SYSTEM =
  "You are FollowUp, a concise assistant for small business owners managing sales leads and follow-ups. Keep replies short and actionable.";

export async function generateAssistantReply(
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    return "AI is not configured on the server yet. Ask your administrator to set OPENAI_API_KEY.";
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 8000),
    })),
  ];

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1024,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return text || "I could not generate a reply. Try again.";
  } catch (err) {
    console.error("OpenAI Error:", err);
    throw new Error("AI request failed");
  }
}
