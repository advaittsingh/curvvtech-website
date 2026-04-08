import { Router, Request, Response, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import {
  createConversation,
  getConversation,
  getConversationMessages,
  addMessage,
  updateConversation,
  saveSummary,
  upsertChatLead,
} from "./chatDb.js";
import { getAIResponse } from "./services/aiService.js";
import { generateConversationSummary } from "./services/summaryService.js";
import { getWhatsAppContinueUrl } from "./services/whatsappService.js";
import { emitNewMessage } from "./chatSocket.js";

const router = Router();

function sanitizeMessage(msg: unknown): string {
  if (typeof msg !== "string") return "";
  return msg.slice(0, 2000).replace(/\0/g, "").trim();
}

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many messages. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.params?.id || req.ip || "anon") as string,
});

router.post("/conversations", async (req: Request, res: Response) => {
  try {
    const visitor_id = String(req.body?.visitor_id || req.ip || "anonymous").slice(0, 256);
    const ip_address =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
    const pages_visited = Array.isArray(req.body?.pages_visited)
      ? req.body.pages_visited.slice(0, 50)
      : [];
    const conv = await createConversation({
      visitor_id,
      ip_address: ip_address ?? undefined,
      pages_visited,
    });
    res.status(201).json(conv);
  } catch (e) {
    req.log?.error({ err: e }, "chat_create_conversation");
    res.status(500).json({ error: "Could not create conversation" });
  }
});

router.get("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const conv = await getConversation(id);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const messages = await getConversationMessages(conv.id);
    res.json({ ...conv, messages });
  } catch (e) {
    req.log?.error({ err: e }, "chat_get_conversation");
    res.status(500).json({ error: "Could not load conversation" });
  }
});

router.post(
  "/conversations/:id/messages",
  messageLimiter as unknown as RequestHandler,
  async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const body = sanitizeMessage(req.body?.message);
    if (!body) {
      res.status(400).json({ error: "Message required" });
      return;
    }
    const conv = await getConversation(id);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if (conv.status === "closed") {
      res.status(400).json({ error: "Conversation is closed" });
      return;
    }

    const userMsg = await addMessage({ conversation_id: id, sender: "user", message: body });
    emitNewMessage(id, userMsg);
    const history = await getConversationMessages(id);
    const chatHistory = history.map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.message,
    }));

    let aiReply: string | null = null;
    let shouldEscalate = false;
    if (!conv.agent_clerk_id) {
      const ai = await getAIResponse(chatHistory, body);
      if (ai) {
        aiReply = ai.message;
        shouldEscalate = ai.shouldEscalate;
        if (ai.extractedLead) {
          await upsertChatLead({ conversation_id: id, ...ai.extractedLead });
        }
      }
    }

    if (aiReply) {
      const aiMsg = await addMessage({ conversation_id: id, sender: "ai", message: aiReply });
      emitNewMessage(id, aiMsg);
      if (shouldEscalate) {
        await updateConversation(id, { status: "escalated" });
      }
    }

    const updated = await getConversationMessages(id);
    res.json({ messages: updated, escalated: shouldEscalate });
  } catch (e) {
    req.log?.error({ err: e }, "chat_post_message");
    res.status(500).json({ error: "Could not send message" });
  }
});

router.post("/conversations/:id/close", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const conv = await getConversation(id);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
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
    res.json({ ok: true });
  } catch (e) {
    req.log?.error({ err: e }, "chat_close_conversation");
    res.status(500).json({ error: "Could not close conversation" });
  }
});

router.get("/whatsapp-url", (req: Request, res: Response) => {
  const companyPhone = String(req.query.phone || process.env.WHATSAPP_COMPANY_NUMBER || "").trim();
  const topic = String(req.query.topic || "my inquiry").slice(0, 200);
  if (!companyPhone) {
    res.status(400).json({ error: "Phone or WHATSAPP_COMPANY_NUMBER required" });
    return;
  }
  const url = getWhatsAppContinueUrl(companyPhone, topic);
  res.json({ url });
});

export default router;
