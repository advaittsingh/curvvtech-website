import { Router } from "express";
import { DemoMailConfigurationError } from "../../demo/demoCalendarMail.js";
import {
  DemoStatusTransitionError,
  listDemoRequestsForAdmin,
  updateDemoRequestStatus,
} from "../../demo/demo.service.js";
import { requireCurvvtechAdmin } from "../../../middleware/requireCurvvtechAdmin.js";

const router = Router();
router.use(requireCurvvtechAdmin);

const STATUSES = ["pending", "confirmed", "completed"] as const;

router.get("/", async (_req, res) => {
  try {
    const rows = await listDemoRequestsForAdmin();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const raw = typeof req.body?.status === "string" ? req.body.status.trim() : "";
    if (!STATUSES.includes(raw as (typeof STATUSES)[number])) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    const row = await updateDemoRequestStatus(id, raw as (typeof STATUSES)[number]);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (e) {
    if (e instanceof DemoMailConfigurationError) {
      res.status(503).json({ error: e.message });
      return;
    }
    if (e instanceof DemoStatusTransitionError) {
      res.status(400).json({ error: e.message });
      return;
    }
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
