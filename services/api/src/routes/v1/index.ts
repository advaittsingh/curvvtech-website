import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requireAccessAllowed } from "../../middleware/requireAccessAllowed.js";
import { resolveTenantContext } from "../../middleware/tenantContext.js";
import { inboxModuleRouter } from "../../modules/inbox/inbox.routes.js";
import { waCrmRouter } from "../../modules/leads/wa-crm.routes.js";
import { tenantsRouter } from "../../modules/tenants/tenants.routes.js";
import { aiRouter } from "./ai.js";
import { devicesRouter } from "./devices.js";
import { feedbackRouter } from "./feedback.js";
import { billingRoutes, handleRazorpayWebhook } from "./billingRoutes.js";
import { leadsRouter } from "./leads.js";
import { meRouter } from "./me.js";
import { publicRouter } from "./public.js";

const v1 = Router();

v1.use("/public", publicRouter);

v1.post("/billing/webhooks/razorpay", (req, res) => {
  void handleRazorpayWebhook(req, res);
});

// Auth lives at /auth/* only; avoid /v1/* + authenticate returning 401 for old clients.
v1.use("/auth", (_req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Auth routes are at /api/auth, not /api/v1/auth",
  });
});

const authed = Router();
authed.use(authenticate);
authed.use(requireAccessAllowed);
authed.use(tenantsRouter);
authed.use(leadsRouter);
authed.use(meRouter);
authed.use(aiRouter);
authed.use(feedbackRouter);
authed.use(devicesRouter);
authed.use(billingRoutes);

const tenantScoped = Router();
tenantScoped.use(authenticate);
tenantScoped.use(requireAccessAllowed);
tenantScoped.use(resolveTenantContext);
tenantScoped.use("/inbox", inboxModuleRouter);
tenantScoped.use("/wa", waCrmRouter);

v1.use(authed);
v1.use(tenantScoped);

export default v1;
