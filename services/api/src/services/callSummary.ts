import { z } from "zod";
import { chatComplete } from "./llm/openaiChat.js";

const SummarySchema = z.object({
  outcome: z.enum(["booked", "interested", "not_interested", "callback", "no_answer", "unknown"]),
  summary: z.string().min(1),
});

export async function summarizeCallTranscript(transcript: string): Promise<{
  outcome: z.infer<typeof SummarySchema>["outcome"];
  summary: string;
}> {
  const prompt = [
    "You are summarizing an outbound sales qualification call.",
    "Return STRICT JSON with keys: outcome, summary.",
    "outcome must be one of: booked, interested, not_interested, callback, no_answer, unknown.",
    "summary should be 1-2 short sentences, neutral tone.",
    "",
    "Transcript:",
    transcript,
  ].join("\n");

  const raw = await chatComplete({
    messages: [
      { role: "system", content: "You output only valid JSON. No markdown." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    maxTokens: 180,
  });

  const jsonText = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = SummarySchema.safeParse(JSON.parse(jsonText));
  if (!parsed.success) {
    return { outcome: "unknown", summary: raw.slice(0, 300) || "Call completed." };
  }
  return parsed.data;
}

