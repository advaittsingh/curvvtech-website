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
  mergeConversationMetadata,
  markConversationRead,
  addInternalNote,
  type ChatMessageRow,
} from "../chatDb.js";
import { sendTranscriptToWhatsApp } from "../services/whatsappService.js";
import { generateConversationSummary } from "../services/summaryService.js";
import { suggestAgentReply } from "../services/aiService.js";
import { emitNewMessage, notifyInboxInbound } from "../chatSocket.js";

/** Map stored chat messages into the {role, content} shape the AI services expect. */
function toAiHistory(messages: ChatMessageRow[]) {
  return messages.map((m) => ({
    role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.message,
  }));
}

type ParticipantType = "client" | "lead" | "guest";
type Participant = {
  type: ParticipantType;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  since: string | null;
};
type ProjectContext = {
  id: string;
  name: string;
  progress_pct: number;
  current_phase: string | null;
  target_end_date: string | null;
  status: string;
  health: "on_track" | "watch" | "at_risk" | "done";
  open_tasks: number;
  pending_approvals: number;
  outstanding_cents: number;
} | null;

function deriveHealth(p: { status: string; progress_pct: number; target_end_date: string | null }): NonNullable<ProjectContext>["health"] {
  if (p.status === "completed" || Number(p.progress_pct) >= 100) return "done";
  const target = p.target_end_date ? new Date(p.target_end_date).getTime() : null;
  const now = Date.now();
  if (target && !Number.isNaN(target)) {
    if (now > target) return "at_risk";
    if (target - now < 7 * 86_400_000 && Number(p.progress_pct) < 80) return "watch";
  }
  return "on_track";
}

/**
 * Resolve a conversation to a real human participant + (for portal chats) the
 * live project context. Never returns a bare "Client" when we can do better.
 */
async function resolveParticipant(
  conv: { visitor_id?: string; source?: string; client_id?: string | null; project_id?: string | null; metadata?: object },
  lead: Record<string, unknown> | undefined,
): Promise<{ participant: Participant; project: ProjectContext; client: Record<string, unknown> | null }> {
  const clientId = conv.client_id ?? null;
  const projectId = conv.project_id ?? null;

  // ── Client portal participant = the client_user person ──
  if (clientId) {
    const client = firstRow<Record<string, unknown>>(
      await sql`SELECT id, name, email, phone, company, website, gst_number, address, status, "createdAt" AS since
                FROM clients WHERE id = ${clientId} LIMIT 1`,
    );
    const visitorId = String(conv.visitor_id ?? "");
    const clientUserId = visitorId.startsWith("client:") ? visitorId.slice("client:".length) : null;
    let user: { name?: string; email?: string; role?: string } | undefined;
    if (clientUserId) {
      user =
        firstRow<{ name?: string; email?: string; role?: string }>(
          await sql`SELECT name, email, role FROM client_users WHERE id::text = ${clientUserId} LIMIT 1`,
        ) ?? undefined;
    }
    const company = (client?.company as string) || (client?.name as string) || null;
    const participant: Participant = {
      type: "client",
      name: user?.name || (client?.name as string) || company || "Client",
      role: user?.role ?? null,
      company,
      email: user?.email || (client?.email as string) || null,
      phone: (client?.phone as string) ?? null,
      since: (client?.since as string) ?? null,
    };

    let project: ProjectContext = null;
    const proj = projectId
      ? firstRow<{ id: string; name: string; progress_pct: number; current_phase: string | null; target_end_date: string | null; status: string }>(
          await sql`SELECT id, name, progress_pct, current_phase, target_end_date, status FROM projects WHERE id = ${projectId} LIMIT 1`,
        )
      : firstRow<{ id: string; name: string; progress_pct: number; current_phase: string | null; target_end_date: string | null; status: string }>(
          await sql`SELECT id, name, progress_pct, current_phase, target_end_date, status FROM projects
                    WHERE client_id = ${clientId} AND status <> 'completed' ORDER BY "updatedAt" DESC LIMIT 1`,
        );
    if (proj) {
      const counts = firstRow<{ open_tasks: number; pending_approvals: number }>(
        await sql`
          SELECT
            (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = ${proj.id} AND t.visibility = 'client' AND t.status <> 'done') AS open_tasks,
            (SELECT COUNT(*)::int FROM approval_requests a WHERE a.client_id = ${clientId} AND a.visibility = 'client' AND a.status = 'pending') AS pending_approvals
        `,
      );
      const outstanding = firstRow<{ cents: string }>(
        await sql`SELECT COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)), 0)::bigint AS cents
                  FROM invoices WHERE client_id = ${clientId} AND status NOT IN ('paid', 'cancelled', 'draft')`,
      );
      project = {
        ...proj,
        health: deriveHealth(proj),
        open_tasks: Number(counts?.open_tasks ?? 0),
        pending_approvals: Number(counts?.pending_approvals ?? 0),
        outstanding_cents: Number(outstanding?.cents ?? 0),
      };
    }
    return { participant, project, client: client ?? null };
  }

  // ── Lead (captured on a website chat) ──
  if (lead && (lead.name || lead.email || lead.business)) {
    return {
      participant: {
        type: "lead",
        name: (lead.name as string) || (lead.business as string) || "Lead",
        role: null,
        company: (lead.business as string) ?? null,
        email: (lead.email as string) ?? null,
        phone: (lead.phone as string) ?? null,
        since: null,
      },
      project: null,
      client: null,
    };
  }

  // ── Anonymous guest ──
  const meta = (conv.metadata ?? {}) as Record<string, unknown>;
  const guestName = (meta.visitor_name as string) || null;
  return {
    participant: {
      type: "guest",
      name: guestName || `Guest #${String(conv.visitor_id ?? "").replace(/\D/g, "").slice(-4) || "0000"}`,
      role: null,
      company: null,
      email: null,
      phone: null,
      since: null,
    },
    project: null,
    client: null,
  };
}

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
    let lead = firstRow<Record<string, unknown>>(
      await sql`SELECT * FROM chat_leads WHERE conversation_id = ${conv.id}::uuid`
    );
    const { participant, project, client } = await resolveParticipant(conv, lead ?? undefined);
    if (client && !lead) {
      lead = {
        name: client.name,
        email: client.email,
        phone: client.phone,
        business: client.company,
      };
    }
    res.json({ ...conv, messages, summary: summary ?? null, lead: lead ?? null, client, participant, project });
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
    const { status, agent_takeover, release_to_ai, tags, priority, assignee_id, assignee_name, notes } = req.body;
    if (agent_takeover === true) {
      await updateConversation(id, { agent_clerk_id: auth.sub, status: "escalated" });
      await mergeConversationMetadata(id, {
        assignee_id: auth.sub,
        assignee_name: auth.email ?? "Agent",
      });
    }
    if (release_to_ai === true) {
      await updateConversation(id, { agent_clerk_id: null, status: "active" });
      await mergeConversationMetadata(id, { assignee_id: null, assignee_name: null });
    }
    if (assignee_id !== undefined) {
      await mergeConversationMetadata(id, {
        assignee_id: assignee_id || null,
        assignee_name: assignee_name ?? null,
      });
      if (assignee_id) {
        await updateConversation(id, { agent_clerk_id: String(assignee_id), status: "escalated" });
      }
    }
    if (tags !== undefined && Array.isArray(tags)) {
      await mergeConversationMetadata(id, { tags });
    }
    if (priority !== undefined) {
      await mergeConversationMetadata(id, { priority: priority || null });
    }
    if (typeof notes === "string" && notes.trim()) {
      await addInternalNote(id, {
        author: auth.sub,
        author_name: auth.email ?? "Agent",
        text: notes.trim(),
      });
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
    const messages = await getConversationMessages(id);
    const summary = firstRow(
      await sql`SELECT * FROM conversation_summaries WHERE conversation_id = ${id}::uuid`
    );
    const lead = firstRow(
      await sql`SELECT * FROM chat_leads WHERE conversation_id = ${id}::uuid`
    );
    res.json({ ...updated, messages, summary: summary ?? null, lead: lead ?? null });
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
    notifyInboxInbound({ conversationId: id, clientId: conv.client_id, sender: "agent" });
    const messages = await getConversationMessages(id);
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/:id/mark-read", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const conv = await getConversation(id);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    await markConversationRead(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/:id/suggest-reply", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const messages = await getConversationMessages(id);
    const suggestion = await suggestAgentReply(toAiHistory(messages));
    res.json({ suggestion });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/:id/summarize", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const messages = await getConversationMessages(id);
    const summary = await generateConversationSummary(messages);
    if (summary) {
      await saveSummary({
        conversation_id: id,
        ...summary,
        extracted_contact: summary.extracted_contact as object | undefined,
      });
    }
    res.json({ summary });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/:id/convert-to-lead", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const conv = await getConversation(id);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const meta = (conv.metadata ?? {}) as Record<string, unknown>;
    if (meta.lead_id) {
      res.json({ lead_id: meta.lead_id, existing: true });
      return;
    }
    const chatLead = firstRow<{
      name?: string;
      email?: string;
      phone?: string;
      business?: string;
      project_type?: string;
      budget?: string;
      timeline?: string;
    }>(await sql`SELECT * FROM chat_leads WHERE conversation_id = ${id}::uuid`);
    const summary = firstRow<{ gist?: string }>(
      await sql`SELECT gist FROM conversation_summaries WHERE conversation_id = ${id}::uuid`
    );
    const messages = await getConversationMessages(id);
    const transcript = messages
      .slice(-8)
      .map((m) => `${m.sender}: ${m.message}`)
      .join("\n");
    const lead = firstRow<{ id: string }>(await sql`
      INSERT INTO crm_leads (source, name, email, phone, company, message, status)
      VALUES (
        'website_chat',
        ${chatLead?.name ?? null},
        ${chatLead?.email ?? null},
        ${chatLead?.phone ?? null},
        ${chatLead?.business ?? null},
        ${summary?.gist ?? transcript.slice(0, 2000) ?? null},
        'new'
      )
      RETURNING id::text AS id
    `);
    if (lead?.id) {
      await mergeConversationMetadata(id, { lead_id: lead.id });
    }
    res.json({ lead_id: lead?.id ?? null });
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
