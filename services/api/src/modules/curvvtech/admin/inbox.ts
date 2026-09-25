import { Router, Request, Response } from "express";
import { sql, firstRow } from "../../../lib/sqlPool.js";

const router = Router();

/** Unread badge for admin sidebar + header (not under /chats/:id to avoid route conflicts). */
router.get("/unread-count", async (_req: Request, res: Response) => {
  try {
    const row = firstRow<{ unread_messages: number; unread_conversations: number }>(
      await sql`
        SELECT
          COALESCE(SUM(u.unread), 0)::int AS unread_messages,
          COUNT(*) FILTER (WHERE u.unread > 0)::int AS unread_conversations
        FROM conversations c
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS unread FROM chat_messages m
          WHERE m.conversation_id = c.id
            AND m.sender <> 'agent'
            AND m."createdAt" > COALESCE((c.metadata->>'admin_last_read_at')::timestamptz, 'epoch'::timestamptz)
        ) u ON TRUE
        WHERE c.status <> 'closed'
      `,
    );
    res.json({
      unread_messages: Number(row?.unread_messages ?? 0),
      unread_conversations: Number(row?.unread_conversations ?? 0),
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
