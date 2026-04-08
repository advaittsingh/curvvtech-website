import { Router, Request, Response } from "express";
import { requireCurvvtechAdmin } from "../../../middleware/requireCurvvtechAdmin.js";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import {
  getConversation,
  getConversationMessages,
  addMessage,
  updateConversation,
  listConversationsForAdmin,
  saveSummary,
} from "../chatDb.js";
import { sendTranscriptToWhatsApp } from "../services/whatsappService.js";
import { generateConversationSummary } from "../services/summaryService.js";
import { emitNewMessage } from "../chatSocket.js";

const router = Router();
router.use(requireCurvvtechAdmin);

router.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const list = await listConversationsForAdmin({ status, limit, offset });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/analytics", async (_req: Request, res: Response) => {
  try {
    const stats = firstRow(
      await sql`
      SELECT
        COUNT(*) FILTER (WHERE started_at::date = CURRENT_DATE) AS chats_today,
        COUNT(*) FILTER (WHERE status = 'closed' AND agent_clerk_id IS NULL) AS ai_resolved,
        COUNT(*) FILTER (WHERE status = 'escalated' OR agent_clerk_id IS NOT NULL) AS human_takeover,
        (SELECT COUNT(*) FROM chat_leads) AS leads_generated
      FROM conversations
    `
    );
    res.json(stats ?? {});
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const conv = await getConversation(id);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const messages = await getConversationMessages(conv.id);
    const summary = firstRow(
      await sql`
      SELECT * FROM conversation_summaries WHERE conversation_id = ${conv.id}::uuid
    `
    );
    res.json({ ...conv, messages, summary: summary ?? null });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);
    const conv = await getConversation(id);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const { status, agent_takeover } = req.body;
    if (agent_takeover === true) {
      await updateConversation(id, { agent_clerk_id: auth.sub, status: "escalated" });
    }
    if (status === "closed") {
      await updateConversation(id, { status: "closed", ended_at: new Date() });
      const messages = await getConversationMessages(id);
      const summary = await generateConversationSummary(messages);
      if (summary) {
        await saveSummary({
          conversation_id: id,
          ...summary,
          extracted_contact: summary.extracted_contact as object | undefined,
        });
      }
    } else if (status) {
      await updateConversation(id, { status });
    }
    const updated = await getConversation(id);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/:id/messages", async (req: Request, res: Response) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);
    const message = String(req.body?.message || "")
      .trim()
      .slice(0, 2000);
    if (!message) {
      res.status(400).json({ error: "Message required" });
      return;
    }
    const conv = await getConversation(id);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const agentMsg = await addMessage({
      conversation_id: id,
      sender: "agent",
      message,
      agent_clerk_id: auth.sub,
    });
    emitNewMessage(id, agentMsg);
    const messages = await getConversationMessages(id);
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/:id/send-transcript-whatsapp", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const phone = String(req.body?.phone || "").trim();
    if (!phone) {
      res.status(400).json({ error: "Phone required" });
      return;
    }
    const messages = await getConversationMessages(id);
    const transcript = messages.map((m) => `${m.sender}: ${m.message}`).join("\n");
    const result = await sendTranscriptToWhatsApp(phone, transcript);
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
