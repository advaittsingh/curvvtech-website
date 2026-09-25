import { Router, type Request, type RequestHandler, type Response } from "express";
import rateLimit from "express-rate-limit";
import { createCareerApplication } from "./careers.service.js";
import { parseMultipartBuffer, readRequestBuffer } from "./multipart.js";

const router = Router();

const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: { error: "Too many applications. Try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
}) as unknown as RequestHandler;

router.post("/apply", applyLimiter, async (req: Request, res: Response) => {
  try {
    const contentType = String(req.headers["content-type"] || "");
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Send the application as multipart form data with a CV file.",
      });
      return;
    }

    const buffer = await readRequestBuffer(req);
    const parsed = parseMultipartBuffer(buffer, contentType);
    const result = await createCareerApplication(parsed);
    if (!result.ok) {
      res.status(result.status ?? 400).json({ error: "VALIDATION_ERROR", message: result.message });
      return;
    }
    res.status(201).json({ ok: true, id: result.id });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 413) {
      res.status(413).json({ error: "VALIDATION_ERROR", message: (e as Error).message });
      return;
    }
    if (status === 400) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: (e as Error).message });
      return;
    }
    req.log?.error({ err: e }, "career_apply_failed");
    res.status(500).json({ error: "SERVER_ERROR", message: "Could not submit application." });
  }
});

export default router;
