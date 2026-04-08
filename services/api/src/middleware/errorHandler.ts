import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { logger } from "../logger.js";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const log = req.log ?? logger;
  if (err instanceof AppError) {
    log.warn({ err: err.message, code: err.code, details: err.details }, "app_error");
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details != null ? { details: err.details } : {}),
    });
  }

  const msg = err instanceof Error ? err.message : "Internal server error";
  log.error({ err, message: msg }, "unhandled_error");
  return res.status(500).json({ error: "INTERNAL", message: "Internal server error" });
}
