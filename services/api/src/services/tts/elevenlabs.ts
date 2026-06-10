import { config } from "../../config.js";

export async function elevenLabsTtsUlaw8k(text: string): Promise<Buffer> {
  if (!config.elevenlabsApiKey || !config.elevenlabsVoiceId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required");
  }
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    config.elevenlabsVoiceId
  )}/stream?output_format=ulaw_8000`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": config.elevenlabsApiKey,
      "Content-Type": "application/json",
      Accept: "audio/*",
    },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_monolingual_v1",
      voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${resp.status}): ${body.slice(0, 200)}`);
  }
  const ab = await resp.arrayBuffer();
  return Buffer.from(ab);
}

