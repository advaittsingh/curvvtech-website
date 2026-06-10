import WebSocket from "ws";
import { config } from "../../config.js";

export type DeepgramTranscript = {
  text: string;
  isFinal: boolean;
  confidence?: number;
};

export class DeepgramLiveStt {
  private ws: WebSocket | null = null;

  constructor(private onTranscript: (t: DeepgramTranscript) => void) {}

  start() {
    if (!config.deepgramApiKey) throw new Error("DEEPGRAM_API_KEY is required");
    const qs = new URLSearchParams({
      encoding: "mulaw",
      sample_rate: "8000",
      channels: "1",
      punctuate: "true",
      interim_results: "true",
      endpointing: "200",
      vad_events: "true",
      smart_format: "true",
    });
    const url = `wss://api.deepgram.com/v1/listen?${qs.toString()}`;
    this.ws = new WebSocket(url, {
      headers: { Authorization: `Token ${config.deepgramApiKey}` },
    });
    this.ws.on("message", (data) => {
      try {
        const txt = typeof data === "string" ? data : data.toString("utf8");
        const j = JSON.parse(txt) as any;
        const alt = j?.channel?.alternatives?.[0];
        const transcript = String(alt?.transcript || "").trim();
        if (!transcript) return;
        const isFinal = Boolean(j?.is_final);
        this.onTranscript({ text: transcript, isFinal, confidence: alt?.confidence });
      } catch {
        /* ignore */
      }
    });
  }

  sendAudio(frame: Buffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(frame);
  }

  stop() {
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
  }
}

