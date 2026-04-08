import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { handleWebhookPost, verifyWebhookGet } from "./webhook.controller.js";

const r = Router();

r.get("/", (req, res) => verifyWebhookGet(req, res));
r.post("/", asyncHandler(async (req, res) => handleWebhookPost(req, res)));

export const whatsappWebhookModuleRouter = r;
