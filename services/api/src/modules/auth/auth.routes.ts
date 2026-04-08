import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { distributedRateLimitPerMinute } from "../../middleware/rateLimitDistributed.js";
import * as c from "./auth.controller.js";

const r = Router();

const authIp = (req: { ip?: string }) => req.ip || "unknown";

r.post(
  "/signup",
  distributedRateLimitPerMinute(10, (req) => `auth-signup:${authIp(req)}`),
  c.signup
);
r.post(
  "/login",
  distributedRateLimitPerMinute(30, (req) => `auth-login:${authIp(req)}`),
  c.login
);
r.post(
  "/refresh",
  distributedRateLimitPerMinute(60, (req) => `auth-refresh:${authIp(req)}`),
  c.refresh
);
r.post("/logout", authenticate, c.logout);
r.get("/me", authenticate, c.me);

export const authModuleRouter = r;
