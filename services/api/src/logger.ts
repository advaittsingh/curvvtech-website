import pino from "pino";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

export const logger = pino({ level: config.logLevel });

export function withRequestLogger() {
  return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    const reqId = randomUUID();
    (req as import("express").Request & { reqId?: string }).reqId = reqId;
    const child = logger.child({ reqId, method: req.method, path: req.path });
    (req as import("express").Request & { log?: pino.Logger }).log = child;
    res.setHeader("X-Request-Id", reqId);
    const start = Date.now();
    res.on("finish", () => {
      child.info({ status: res.statusCode, ms: Date.now() - start }, "request");
    });
    next();
  };
}
