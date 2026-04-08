import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as inboxService from "./inbox.service.js";

function paramId(v: string | string[] | undefined): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const out = await inboxService.listConversations(req.tenantId!, limit, cursor);
  res.json(out);
});

export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const out = await inboxService.getConversation(req.tenantId!, paramId(req.params.id));
  res.json(out);
});

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const before = typeof req.query.before === "string" ? req.query.before : undefined;
  const out = await inboxService.listMessages(req.tenantId!, paramId(req.params.id), limit, before);
  res.json(out);
});

export const postMessage = asyncHandler(async (req: Request, res: Response) => {
  const out = await inboxService.sendMessage(req.tenantId!, paramId(req.params.id), req.body);
  if (!out.ok) {
    return res.status(502).json({ error: "SEND_FAILED", message: out.error });
  }
  res.status(201).json({ wa_message_id: out.wa_message_id });
});

export const postMarkRead = asyncHandler(async (req: Request, res: Response) => {
  await inboxService.markRead(req.tenantId!, paramId(req.params.id));
  res.json({ ok: true });
});
