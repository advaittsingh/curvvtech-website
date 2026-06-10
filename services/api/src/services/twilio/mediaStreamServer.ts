import type http from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { logger } from "../../logger.js";
import { pool } from "../../db.js";
import { DeepgramLiveStt } from "../stt/deepgramLive.js";
import { elevenLabsTtsUlaw8k } from "../tts/elevenlabs.js";
import { summarizeCallTranscript } from "../callSummary.js";
import { onCallFinished } from "../../events/callEvents.js";
import { scheduleCallbackFromUtterance } from "../callbackScheduler.js";
import { liveRemove, liveUpsert } from "./liveCallState.js";
import {
  engineIntroGreeting,
  engineNext,
  type ConversationState,
  type ConversationTurn,
} from "../conversationEngine.js";
import { config } from "../../config.js";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function asText(data: any): string {
  if (typeof data === "string") return data;
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  return String(data ?? "");
}

function chunkUlaw20ms(audio: Buffer) {
  // 8kHz, 8-bit mu-law => 8000 bytes/sec. 20ms => 160 bytes.
  const frame = 160;
  const out: Buffer[] = [];
  for (let i = 0; i < audio.length; i += frame) out.push(audio.subarray(i, i + frame));
  return out;
}

async function writeTranscript(callLogId: string, turns: ConversationTurn[]) {
  const transcript = turns.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join("\n");
  await pool.query(`UPDATE call_logs SET transcript = $2 WHERE id = $1::uuid`, [callLogId, transcript]);
  return transcript;
}

export function attachTwilioMediaStreamServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    try {
      const u = new URL(req.url || "", "http://localhost");
      if (u.pathname !== "/webhook/twilio/voice/stream") return;
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } catch {
      // ignore invalid upgrades
    }
  });

  wss.on("connection", (ws: WebSocket, req) => {
    const u = new URL(req.url || "", "http://localhost");
    const callLogId = String(u.searchParams.get("callLogId") || "").trim();
    if (!callLogId) {
      ws.close();
      return;
    }

    let streamSid = "";
    let state: ConversationState = "INTRO";
    const turns: ConversationTurn[] = [];
    let finalized = false;
    const script =
      (process.env.AI_CALL_SCRIPT?.trim() as any) ||
      (config.nodeEnv === "production" ? "curvvtech_services" : "curvvtech_services");
    let leadName: string | null = null;
    let leadPhone: string | null = null;
    let leadCompany: string | null = null;

    let playingAbort: AbortController | null = null;
    function stopPlayback() {
      if (playingAbort) {
        playingAbort.abort();
        playingAbort = null;
      }
    }

    async function playTts(text: string) {
      stopPlayback();
      const ac = new AbortController();
      playingAbort = ac;
      liveUpsert({ callLogId, status: "talking", lastAiText: text });
      const audio = await elevenLabsTtsUlaw8k(text);
      for (const frame of chunkUlaw20ms(audio)) {
        if (ac.signal.aborted) return;
        const payload = frame.toString("base64");
        ws.send(JSON.stringify({ event: "media", streamSid, media: { payload } }));
        await sleep(20);
      }
    }

    const stt = new DeepgramLiveStt(async ({ text, isFinal }) => {
      // User is speaking: stop current playback so we don't talk over them.
      stopPlayback();
      if (!isFinal) return;

      turns.push({ role: "user", text });
      try {
        const r = await engineNext({
          state,
          turns,
          latestUserText: text,
          ctx: {
            script: script === "followup_saas" ? "followup_saas" : "curvvtech_services",
            leadName,
            leadPhone,
            company: leadCompany,
          },
        });
        state = r.nextState;
        turns.push({ role: "assistant", text: r.replyText });
        await writeTranscript(callLogId, turns);
        await playTts(r.replyText);
      } catch (e) {
        logger.error({ err: e instanceof Error ? e.message : String(e), callLogId }, "ai_call_engine_error");
      }
    });

    async function finalize() {
      if (finalized) return;
      finalized = true;
      try {
        const transcript = await writeTranscript(callLogId, turns);
        const { outcome, summary } = await summarizeCallTranscript(transcript || "No transcript.");

        const leadRow = await pool.query(
          `SELECT crm_lead_id::text FROM call_logs WHERE id = $1::uuid`,
          [callLogId]
        );
        const crmLeadId = String(leadRow.rows?.[0]?.crm_lead_id || "").trim();

        await pool.query(
          `UPDATE call_logs
           SET status = 'completed',
               outcome = $2,
               summary = $3,
               ended_at = COALESCE(ended_at, now())
           WHERE id = $1::uuid`,
          [callLogId, outcome, summary]
        );

        if (crmLeadId) {
          await pool.query(
            `UPDATE crm_leads
             SET call_status = 'completed',
                 "updatedAt" = now()
             WHERE id = $1::uuid`,
            [crmLeadId]
          );
          await onCallFinished({ crmLeadId, outcome, summary });

          if (outcome === "callback") {
            const lastUser = [...turns].reverse().find((t) => t.role === "user")?.text || "";
            await scheduleCallbackFromUtterance({ crmLeadId, utterance: lastUser });
          }
        }
      } catch (e) {
        logger.error({ err: e instanceof Error ? e.message : String(e), callLogId }, "ai_call_finalize_error");
      }
    }

    ws.on("message", async (data) => {
      const msg = asText(data);
      let j: any;
      try {
        j = JSON.parse(msg);
      } catch {
        return;
      }
      const ev = String(j?.event || "");
      if (ev === "start") {
        streamSid = String(j?.start?.streamSid || "");
        stt.start();
        try {
          const ctxRow = await pool.query(
            `SELECT l.name, l.phone, l.company
             FROM call_logs cl
             JOIN crm_leads l ON l.id = cl.crm_lead_id
             WHERE cl.id = $1::uuid`,
            [callLogId]
          );
          leadName = (ctxRow.rows?.[0]?.name as string | null) ?? null;
          leadPhone = (ctxRow.rows?.[0]?.phone as string | null) ?? null;
          leadCompany = (ctxRow.rows?.[0]?.company as string | null) ?? null;
          liveUpsert({
            callLogId,
            status: "connected",
            crmLeadId: String((await pool.query(`SELECT crm_lead_id::text FROM call_logs WHERE id = $1::uuid`, [callLogId])).rows?.[0]?.crm_lead_id || ""),
            leadName,
            leadPhone,
            startedAt: Date.now(),
          });

          const intro = engineIntroGreeting({
            script: script === "followup_saas" ? "followup_saas" : "curvvtech_services",
            leadName,
            leadPhone,
            company: leadCompany,
          });
          turns.push({ role: "assistant", text: intro.replyText });
          await writeTranscript(callLogId, turns);
          await playTts(intro.replyText);
        } catch (e) {
          logger.error({ err: e instanceof Error ? e.message : String(e), callLogId }, "ai_call_intro_error");
        }
        return;
      }
      if (ev === "media") {
        const payload = String(j?.media?.payload || "");
        if (!payload) return;
        const audio = Buffer.from(payload, "base64");
        stt.sendAudio(audio);
        return;
      }
      if (ev === "stop") {
        stt.stop();
        stopPlayback();
        await finalize();
        ws.close();
      }
    });

    ws.on("close", () => {
      stt.stop();
      stopPlayback();
      void finalize();
      liveRemove(callLogId);
    });
  });

  logger.info({ path: "/webhook/twilio/voice/stream" }, "twilio_media_stream_ws_attached");
  return wss;
}

