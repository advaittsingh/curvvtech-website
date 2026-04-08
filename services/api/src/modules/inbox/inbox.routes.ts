import { Router } from "express";
import * as c from "./inbox.controller.js";

const r = Router();

r.get("/conversations", c.listConversations);
r.get("/conversations/:id", c.getConversation);
r.get("/conversations/:id/messages", c.listMessages);
r.post("/conversations/:id/messages", c.postMessage);
r.post("/conversations/:id/read", c.postMarkRead);

export const inboxModuleRouter = r;
