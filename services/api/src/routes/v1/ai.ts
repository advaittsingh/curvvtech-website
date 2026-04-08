import { Router } from "express";
import { pool } from "../../db.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { assertQuota } from "../../modules/billing/planUsage.js";
import { rateLimitPerMinute } from "../../middleware/rateLimit.js";
import { config } from "../../config.js";
import { generateAssistantReply } from "../../services/aiChat.js";

export const aiRouter = Router();

aiRouter.get("/ai/chat/messages", async (req, res) => {
  const userId = req.internalUser!.id;
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const r = await pool.query(
    `SELECT id, role, content, created_at
     FROM ai_chat_messages
     WHERE user_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [userId, limit]
  );
  return res.json({ messages: r.rows });
});

aiRouter.delete("/ai/chat/messages", async (req, res) => {
  const userId = req.internalUser!.id;
  await pool.query(`DELETE FROM ai_chat_messages WHERE user_id = $1`, [userId]);
  return res.json({ ok: true });
});

aiRouter.post(
  "/ai/chat",
  rateLimitPerMinute(config.rateLimitAiPerMin, (r) => `ai:${r.internalUser!.id}`),
  asyncHandler(async (req, res) => {
    const userId = req.internalUser!.id;
    const message = req.body?.message;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    const trimmed = message.trim().slice(0, 8000);

    await assertQuota(pool, userId, "ai_user_message");

    await pool.query(
      `INSERT INTO ai_chat_messages (user_id, role, content) VALUES ($1, 'user', $2)`,
      [userId, trimmed]
    );

    const hist = await pool.query(
      `SELECT role, content FROM ai_chat_messages
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    const ordered = [...hist.rows].reverse() as { role: string; content: string }[];
    const openaiHist = ordered.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    try {
      const reply = await generateAssistantReply(openaiHist);
      await pool.query(
        `INSERT INTO ai_chat_messages (user_id, role, content) VALUES ($1, 'assistant', $2)`,
        [userId, reply]
      );
      return res.json({ reply });
    } catch (e) {
      req.log?.error({ err: e }, "ai_chat");
      const msg = e instanceof Error ? e.message : "Could not generate reply";
      return res.status(502).json({ error: "ai_upstream", message: msg });
    }
  })
);
