import { Router, type Request, type RequestHandler, type Response } from "express";
import rateLimit from "express-rate-limit";
import {
  bookDemoSlot,
  listAvailableSlots,
  validateBookInput,
} from "./demo.service.js";

const router = Router();

const demoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { error: "Too many requests. Try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
}) as unknown as RequestHandler;

router.get("/slots", demoLimiter, async (req: Request, res: Response) => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date.trim() : "";
    if (!date) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Missing date query (YYYY-MM-DD)" });
      return;
    }
    const slots = await listAvailableSlots(date);
    res.json({ date, slots });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: (e as Error).message });
  }
});

router.post("/book", demoLimiter, async (req: Request, res: Response) => {
  try {
    const v = validateBookInput(req.body);
    if (!v.ok) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: v.message });
      return;
    }
    const result = await bookDemoSlot(v.data);
    if (!result.ok) {
      if (result.code === "SLOT_TAKEN") {
        res.status(409).json({ error: "SLOT_TAKEN", message: result.message });
        return;
      }
      res.status(500).json({ error: "SERVER_ERROR", message: result.message });
      return;
    }
    res.status(201).json({
      ok: true,
      booking: {
        id: result.request.id,
        date: result.request.date,
        time: result.request.time,
        status: result.request.status,
      },
    });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: (e as Error).message });
  }
});

export default router;
