import OpenAI from "openai";
import { config } from "../../../config.js";
import { logger } from "../../../logger.js";
import type { ClientPortalContext } from "../clientAuth.middleware.js";
import { listProjectsForClient, getMilestonesForClient, getScopeForClient } from "../../shared/projects/projectService.js";
import { listTasksForClient } from "../../shared/tasks/taskService.js";
import { listInvoicesForClient } from "../../shared/invoices/invoiceService.js";
import { listFilesForClient } from "../../shared/files/fileService.js";
import { getClientTimeline } from "../../shared/activity/emitActivityEvent.js";

export type ClientAiContext = {
  projects: unknown[];
  milestones: unknown[];
  tasks: unknown[];
  invoices: unknown[];
  files: unknown[];
  timeline: unknown[];
  scope: unknown[];
};

export async function buildClientAiContext(
  ctx: ClientPortalContext,
  projectId?: string,
): Promise<ClientAiContext> {
  const projects = await listProjectsForClient(ctx);
  const invoices = await listInvoicesForClient(ctx);
  const files = await listFilesForClient(ctx, projectId ? { projectId } : {});
  const timeline = await getClientTimeline(ctx.organizationId, ctx.clientId, { projectId, limit: 30 });
  const milestones = projectId ? (await getMilestonesForClient(ctx, projectId)) ?? [] : [];
  const tasks = projectId ? (await listTasksForClient(ctx, projectId)) ?? [] : [];
  const scope = projectId ? (await getScopeForClient(ctx, projectId)) ?? [] : [];
  return { projects, milestones, tasks, invoices, files, timeline, scope };
}

export type ClientAiAction = { type: string; id?: string; route?: string; label?: string };

export type ClientAiResult = { reply: string; actions: ClientAiAction[] };

let _openai: OpenAI | null = null;
function openai(): OpenAI | null {
  if (!config.openaiApiKey) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: config.openaiApiKey });
  return _openai;
}

export async function answerClientQuestion(
  message: string,
  context: ClientAiContext,
): Promise<ClientAiResult> {
  const client = openai();
  if (!client) {
    return {
      reply:
        "The AI assistant is not configured yet. You can view your projects, invoices, and files directly from the menu.",
      actions: [],
    };
  }

  const system = [
    "You are the client assistant for a Curvvtech project portal.",
    "Answer ONLY using the provided context JSON. Be concise and friendly.",
    "If the client asks about progress, quote the project's progress_pct and current_phase.",
    "If they ask to see an invoice or file, mention it and rely on the UI to open it.",
    "Never reveal internal costs, margins, or staff notes. If unknown, say you'll check with the team.",
  ].join(" ");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "system", content: `CONTEXT:\n${JSON.stringify(context).slice(0, 12000)}` },
        { role: "user", content: message },
      ],
    });
    const reply = completion.choices[0]?.message?.content?.trim() || "I couldn't generate a response.";
    return { reply, actions: deriveActions(message) };
  } catch (e) {
    logger.warn({ err: e }, "client_ai_failed");
    return { reply: "Sorry, I ran into an issue. Please try again shortly.", actions: [] };
  }
}

function deriveActions(message: string): ClientAiAction[] {
  const lower = message.toLowerCase();
  const actions: ClientAiAction[] = [];
  if (lower.includes("invoice") || lower.includes("pay") || lower.includes("bill")) {
    actions.push({ type: "open_billing", route: `/billing`, label: "Open billing" });
  }
  if (lower.includes("file") || lower.includes("document") || lower.includes("download") || lower.includes("asset") || lower.includes("deliverable") || lower.includes("upload")) {
    actions.push({ type: "open_files", route: `/project/files`, label: "Open project files" });
  }
  if (lower.includes("meeting") || lower.includes("call") || lower.includes("schedule")) {
    actions.push({ type: "open_meetings", route: `/meetings`, label: "View meetings" });
  }
  if (lower.includes("progress") || lower.includes("status") || lower.includes("where") || lower.includes("timeline")) {
    actions.push({ type: "open_project", route: `/project`, label: "Open workspace" });
  }
  return actions;
}
