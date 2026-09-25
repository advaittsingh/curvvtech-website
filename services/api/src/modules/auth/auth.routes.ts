import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { distributedRateLimitPerMinute } from "../../middleware/rateLimitDistributed.js";
import * as c from "./auth.controller.js";
import { pool } from "../../db.js";
import {
  acceptStaffInvitation,
  StaffInviteError,
  validateStaffInvitation,
} from "./staffInvitations.service.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

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
r.get(
  "/staff-invites/:token",
  distributedRateLimitPerMinute(30, (req) => `staff-invite-check:${authIp(req)}`),
  asyncHandler(async (req, res) => {
    try {
      const invitation = await validateStaffInvitation(pool, String(req.params.token));
      res.json({ valid: true, invitation });
    } catch (error) {
      if (error instanceof StaffInviteError) {
        res.status(error.status).json({ error: "INVALID_INVITATION", message: error.message });
        return;
      }
      throw error;
    }
  }),
);
r.post(
  "/staff-invites/:token/accept",
  distributedRateLimitPerMinute(10, (req) => `staff-invite-accept:${authIp(req)}`),
  asyncHandler(async (req, res) => {
    try {
      const result = await acceptStaffInvitation(pool, {
        token: String(req.params.token),
        password: typeof req.body?.password === "string" ? req.body.password : "",
        displayName:
          typeof req.body?.name === "string"
            ? req.body.name
            : typeof req.body?.display_name === "string"
              ? req.body.display_name
              : undefined,
      });
      res.status(201).json({
        ok: true,
        user: result.user,
        ...result.tokens,
      });
    } catch (error) {
      if (error instanceof StaffInviteError) {
        res.status(error.status).json({ error: "INVALID_INVITATION", message: error.message });
        return;
      }
      throw error;
    }
  }),
);

export const authModuleRouter = r;
