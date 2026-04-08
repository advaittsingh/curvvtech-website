import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

export function requireLandingApiKey(req: Request, res: Response, next: NextFunction) {
  if (!config.landingApiKey) {
    return res.status(503).json({
      error: "Landing API is not configured",
      code: "LANDING_API_DISABLED",
    });
  }
  const key = req.headers["x-followup-api-key"];
  if (typeof key !== "string" || key !== config.landingApiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
