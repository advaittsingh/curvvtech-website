import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { config } from "../../config.js";
import { pool } from "../../db.js";
import { assertBusinessInsightsAllowed } from "../billing/businessInsights.js";
import { rateLimitPerMinute } from "../../middleware/rateLimit.js";
import * as ai from "../../services/leadDetailAi.service.js";
import * as svc from "./wa-crm.service.js";

function paramId(v: string | string[] | undefined): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

const patchSchema = z
  .object({
    status: z.string().min(1).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    assigned_to_user_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export const listWaLeads = asyncHandler(async (req: Request, res: Response) => {
  const rows = await svc.listWaLeads(req.tenantId!);
  res.json({ leads: rows });
});

export const patchWaLead = asyncHandler(async (req: Request, res: Response) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  const out = await svc.patchWaLead(
    req.tenantId!,
    paramId(req.params.id),
    parsed.data,
    req.internalUser!.id,
    req.tenantRole!
  );
  res.json(out);
});

export const postWaLeadGenerateInsights = [
  rateLimitPerMinute(config.rateLimitAiPerMin, (r) => `wa-lead-insights:${r.internalUser!.id}`),
  asyncHandler(async (req: Request, res: Response) => {
    await assertBusinessInsightsAllowed(pool, req.internalUser!.id);
    const out = await ai.generateWaLeadInsights(req.tenantId!, paramId(req.params.id));
    res.json(out);
  }),
];

export const postWaLeadFollowUpDraft = [
  rateLimitPerMinute(config.rateLimitAiPerMin, (r) => `wa-lead-draft:${r.internalUser!.id}`),
  asyncHandler(async (req: Request, res: Response) => {
    await assertBusinessInsightsAllowed(pool, req.internalUser!.id);
    const out = await ai.generateWaFollowUpDraft(req.tenantId!, paramId(req.params.id));
    res.json(out);
  }),
];
