import { Router } from "express";
import * as c from "./wa-crm.controller.js";

export const waCrmRouter = Router();

waCrmRouter.get("/leads", c.listWaLeads);
waCrmRouter.post("/leads/:id/generate-insights", ...c.postWaLeadGenerateInsights);
waCrmRouter.post("/leads/:id/follow-up-draft", ...c.postWaLeadFollowUpDraft);
waCrmRouter.patch("/leads/:id", c.patchWaLead);
