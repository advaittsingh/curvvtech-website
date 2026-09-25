import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { resolveOrganization, requireOrgRole } from "./middleware/resolveOrganization.js";
import { bootstrapOrganization, listUserOrganizations } from "./lib/bootstrap.js";
import { listAgents, getAgentRuns, chatWithAgent, runAgentForEvent } from "./lib/agentRuntime.js";
import * as brain from "./lib/brain.js";
import * as crm from "./lib/crm.js";
import * as finance from "./lib/finance.js";
import * as marketing from "./lib/marketing.js";
import * as ops from "./lib/operations.js";
import * as cc from "./lib/commandCenter.js";
import { listWorkflows, triggerWorkflow } from "./lib/workflows.js";
import { listEvents } from "./lib/events.js";

const r = Router();

r.use(authenticate);

r.get(
  "/orgs",
  asyncHandler(async (req, res) => {
    const orgs = await listUserOrganizations(req.internalUser!.id);
    res.json({ organizations: orgs });
  })
);

r.post(
  "/orgs",
  asyncHandler(async (req, res) => {
    const { name, industry } = req.body as { name?: string; industry?: string };
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const org = await bootstrapOrganization(req.internalUser!.id, name.trim(), industry);
    res.status(201).json({ organization: org });
  })
);

const org = Router();
org.use(resolveOrganization);

// Command Center (Sprint 7)
org.get("/command-center/metrics", asyncHandler(async (req, res) => {
  res.json(await cc.getCommandCenterMetrics(req.bosOrg!.id));
}));
org.get("/command-center/briefing", asyncHandler(async (req, res) => {
  const name = req.internalUser?.email?.split("@")[0];
  res.json(await cc.getBriefing(req.bosOrg!.id, name));
}));
org.get("/command-center/recommendations", asyncHandler(async (req, res) => {
  res.json({ recommendations: await cc.listRecommendations(req.bosOrg!.id) });
}));
org.post("/command-center/recommendations/:id/approve", requireOrgRole("owner", "admin", "manager"), asyncHandler(async (req, res) => {
  res.json(await cc.approveRecommendation(req.bosOrg!.id, String(req.params.id)));
}));
org.get("/command-center/risks", asyncHandler(async (req, res) => {
  res.json({ risks: await cc.listRisks(req.bosOrg!.id) });
}));
org.get("/command-center/actions", asyncHandler(async (req, res) => {
  res.json({ actions: await cc.getActionsFeed(req.bosOrg!.id) });
}));
org.get("/command-center/workforce", asyncHandler(async (req, res) => {
  res.json({ workforce: await cc.getWorkforceStatus(req.bosOrg!.id) });
}));

// Agents (Sprint 1-3)
org.get("/agents", asyncHandler(async (req, res) => {
  res.json({ agents: await listAgents(req.bosOrg!.id) });
}));
org.get("/agents/:id/runs", asyncHandler(async (req, res) => {
  res.json({ runs: await getAgentRuns(req.bosOrg!.id, String(req.params.id)) });
}));
org.post("/agents/:id/run", requireOrgRole("owner", "admin", "manager"), asyncHandler(async (req, res) => {
  const agents = await listAgents(req.bosOrg!.id);
  const agent = agents.find((a: { id: string }) => a.id === String(req.params.id));
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const result = await runAgentForEvent(req.bosOrg!.id, agent.definition_slug, req.body.action ?? "Manual run", req.body.context ?? {});
  res.json(result);
}));

// Brain (Sprint 2)
org.get("/brain/stats", asyncHandler(async (req, res) => {
  res.json(await brain.getBrainStats(req.bosOrg!.id));
}));
org.get("/brain/knowledge", asyncHandler(async (req, res) => {
  res.json({ entries: await brain.listKnowledge(req.bosOrg!.id) });
}));
org.post("/brain/knowledge", asyncHandler(async (req, res) => {
  const entry = await brain.createKnowledge(req.bosOrg!.id, {
    title: req.body.title,
    content_text: req.body.content_text,
    domain: req.body.domain,
    created_by: req.internalUser!.id,
  });
  res.status(201).json({ entry });
}));
org.get("/brain/search", asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "");
  res.json({ results: q ? await brain.searchKnowledge(req.bosOrg!.id, q) : [] });
}));
org.get("/brain/memories", asyncHandler(async (req, res) => {
  res.json({ memories: await brain.listMemories(req.bosOrg!.id) });
}));
org.get("/brain/documents", asyncHandler(async (req, res) => {
  res.json({ documents: await brain.listDocuments(req.bosOrg!.id) });
}));
org.post("/brain/documents", asyncHandler(async (req, res) => {
  res.status(201).json({ document: await brain.createDocument(req.bosOrg!.id, req.body) });
}));

// CRM (Sprint 3)
org.get("/leads", asyncHandler(async (req, res) => {
  res.json({ leads: await crm.listLeads(req.bosOrg!.id) });
}));
org.post("/leads", asyncHandler(async (req, res) => {
  res.status(201).json({ lead: await crm.createLead(req.bosOrg!.id, req.body) });
}));
org.patch("/leads/:id", asyncHandler(async (req, res) => {
  res.json({ lead: await crm.updateLead(req.bosOrg!.id, String(req.params.id), req.body) });
}));
org.get("/contacts", asyncHandler(async (req, res) => {
  res.json({ contacts: await crm.listContacts(req.bosOrg!.id) });
}));
org.get("/companies", asyncHandler(async (req, res) => {
  res.json({ companies: await crm.listCompanies(req.bosOrg!.id) });
}));
org.get("/deals", asyncHandler(async (req, res) => {
  res.json({ deals: await crm.listDeals(req.bosOrg!.id) });
}));
org.get("/activities", asyncHandler(async (req, res) => {
  res.json({ activities: await crm.listActivities(req.bosOrg!.id) });
}));

// Workflows (Sprint 4)
org.get("/workflows", asyncHandler(async (req, res) => {
  res.json(await listWorkflows(req.bosOrg!.id));
}));
org.post("/workflows/:slug/trigger", asyncHandler(async (req, res) => {
  res.json(await triggerWorkflow(req.bosOrg!.id, String(req.params.slug), req.body ?? {}));
}));
org.get("/events", asyncHandler(async (req, res) => {
  res.json({ events: await listEvents(req.bosOrg!.id) });
}));
org.get("/notifications", asyncHandler(async (req, res) => {
  res.json({ notifications: await ops.listNotifications(req.bosOrg!.id, req.internalUser!.id) });
}));
org.post("/notifications/:id/read", asyncHandler(async (req, res) => {
  await ops.markNotificationRead(req.bosOrg!.id, String(req.params.id));
  res.json({ ok: true });
}));
org.get("/tasks", asyncHandler(async (req, res) => {
  res.json({ tasks: await ops.listTasks(req.bosOrg!.id) });
}));
org.post("/tasks", asyncHandler(async (req, res) => {
  res.status(201).json({ task: await ops.createTask(req.bosOrg!.id, req.body) });
}));
org.get("/projects", asyncHandler(async (req, res) => {
  res.json({ projects: await ops.listProjects(req.bosOrg!.id) });
}));

// Finance (Sprint 5)
org.get("/finance/summary", asyncHandler(async (req, res) => {
  res.json(await finance.getFinanceSummary(req.bosOrg!.id));
}));
org.get("/invoices", asyncHandler(async (req, res) => {
  res.json({ invoices: await finance.listInvoices(req.bosOrg!.id) });
}));
org.post("/invoices", asyncHandler(async (req, res) => {
  res.status(201).json({ invoice: await finance.createInvoice(req.bosOrg!.id, req.body) });
}));
org.get("/expenses", asyncHandler(async (req, res) => {
  res.json({ expenses: await finance.listExpenses(req.bosOrg!.id) });
}));
org.post("/expenses", asyncHandler(async (req, res) => {
  res.status(201).json({ expense: await finance.createExpense(req.bosOrg!.id, req.body) });
}));
org.get("/payments", asyncHandler(async (req, res) => {
  res.json({ payments: await finance.listPayments(req.bosOrg!.id) });
}));

// Marketing & Integrations (Sprint 6)
org.get("/marketing/summary", asyncHandler(async (req, res) => {
  res.json(await marketing.getMarketingSummary(req.bosOrg!.id));
}));
org.get("/campaigns", asyncHandler(async (req, res) => {
  res.json({ campaigns: await marketing.listCampaigns(req.bosOrg!.id) });
}));
org.post("/campaigns", asyncHandler(async (req, res) => {
  res.status(201).json({ campaign: await marketing.createCampaign(req.bosOrg!.id, req.body) });
}));
org.get("/integrations", asyncHandler(async (req, res) => {
  res.json({ integrations: await marketing.listIntegrations(req.bosOrg!.id) });
}));
org.post("/integrations/:provider/connect", requireOrgRole("owner", "admin"), asyncHandler(async (req, res) => {
  res.json(await marketing.connectIntegration(req.bosOrg!.id, String(req.params.provider)));
}));
org.post("/integrations/:provider/sync", asyncHandler(async (req, res) => {
  res.json(await marketing.syncIntegration(req.bosOrg!.id, String(req.params.provider)));
}));

// AI Chat (Sprint 1)
org.post("/chat", asyncHandler(async (req, res) => {
  const { message, agentSlug } = req.body as { message?: string; agentSlug?: string };
  if (!message?.trim()) return res.status(400).json({ error: "Message required" });
  res.json(await chatWithAgent(req.bosOrg!.id, req.internalUser!.id, message.trim(), agentSlug));
}));

r.use("/orgs/:orgId", org);

export const businessOsRouter = r;
