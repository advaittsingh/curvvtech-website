import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { dbHealth } from "./db.js";
import { withRequestLogger } from "./logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authModuleRouter } from "./modules/auth/auth.routes.js";
import curvvtechAdminRouter from "./modules/curvvtech/admin/index.js";
import chatPublicRouter from "./modules/curvvtech/chat.routes.js";
import { whatsappWebhookModuleRouter } from "./modules/whatsapp/whatsapp.routes.js";
import v1Router from "./routes/v1/index.js";
import demoPublicRouter from "./modules/demo/demo.routes.js";

/**
 * Vercel FollowUp web app: production hostname + preview deploys
 * (e.g. follow-up-website-landing-abc123-curvvtech.vercel.app).
 * Prefix match avoids missing a hostname variant after deploys.
 */
function isFollowupVercelOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "https:") return false;
    return hostname.endsWith(".vercel.app") && hostname.startsWith("follow-up-website-landing");
  } catch {
    return false;
  }
}

function buildCorsOriginHandler() {
  const extra = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_PANEL_URL,
    process.env.WEBSITE_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://www.curvvtech.com",
    "https://curvvtech.com",
    "https://www.curvvtech.in",
    "https://admin.curvvtech.com",
    "https://followup.curvvtech.com",
    "https://followup.curvvtech.in",
    /** Explicit: same as isFollowupVercelOrigin (belt-and-suspenders if matcher ever diverges). */
    "https://follow-up-website-landing.vercel.app",
    ...config.corsOrigins,
  ]
    .map((s) => s?.trim())
    .filter(Boolean) as string[];
  const allowed = new Set(extra);

  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    if (allowed.has(origin)) return cb(null, true);
    if (isFollowupVercelOrigin(origin)) return cb(null, true);
    cb(null, false);
  };
}

export function createApp(): express.Application {
  const app = express();
  app.set("trust proxy", 1);
  app.use(withRequestLogger());
  app.use(
    cors({
      origin: buildCorsOriginHandler(),
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-followup-api-key"],
    })
  );
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: express.Request, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/ready", async (_req, res) => {
    const ok = await dbHealth();
    res.status(ok ? 200 : 503).json({ ok });
  });

  app.use("/webhook/whatsapp", whatsappWebhookModuleRouter);
  app.use("/api/webhook/whatsapp", whatsappWebhookModuleRouter);

  app.use("/auth", authModuleRouter);
  app.use("/api/auth", authModuleRouter);

  app.use("/v1", v1Router);
  app.use("/api/v1", v1Router);

  app.use("/api/admin", curvvtechAdminRouter);
  /** Alias for proxies that do not expose `/api/admin/*` (same router). */
  app.use("/admin", curvvtechAdminRouter);
  app.use("/api/chat", chatPublicRouter);
  app.use("/api/demo", demoPublicRouter);
  /** Alias for proxies without `/api` prefix (same as `/admin`). */
  app.use("/demo", demoPublicRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
  });

  app.use(errorHandler);

  return app;
}
