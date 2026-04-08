import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

/**
 * Blocks waitlisted users (`access_allowed = false`) from product API routes.
 * Skipped when SKIP_AUTH=true (local dev).
 */
export function requireAccessAllowed(req: Request, res: Response, next: NextFunction): void {
  if (config.skipAuth) {
    next();
    return;
  }
  const u = req.internalUser;
  if (!u) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Not authenticated",
    });
    return;
  }
  if (!u.accessAllowed) {
    res.status(403).json({
      error: "ACCESS_PENDING",
      message:
        "Your account is on the waitlist. We will notify you when access is available.",
    });
    return;
  }
  next();
}
