import { Router } from "express";
import {
  careersInterviewSetup,
  getCareerApplication,
  listCareerApplications,
  listCareerRoleSummaries,
  loadApplicationResume,
  rejectCareerApplication,
  setCareerApplicationStatus,
  shortlistCareerApplication,
  toPublicApplication,
  type CareerApplicationStatus,
} from "../careers/careers.service.js";

const router = Router();

router.get("/setup", async (req, res) => {
  try {
    const setup = await careersInterviewSetup(req.auth!.sub);
    res.json(setup);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/roles", async (_req, res) => {
  try {
    const roles = await listCareerRoleSummaries();
    res.json({ roles });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/applications", async (req, res) => {
  try {
    const roleSlug = typeof req.query.role_slug === "string" ? req.query.role_slug.trim() : undefined;
    const rawStatus = typeof req.query.status === "string" ? req.query.status.trim() : "new";
    const status =
      rawStatus === "rejected" ||
      rawStatus === "all" ||
      rawStatus === "new" ||
      rawStatus === "shortlisted"
        ? (rawStatus as CareerApplicationStatus | "all")
        : "new";
    const rows = await listCareerApplications({ roleSlug, status });
    res.json({ applications: rows.map(toPublicApplication) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/applications/:id/resume", async (req, res) => {
  try {
    const loaded = await loadApplicationResume(req.params.id);
    if (!loaded) {
      res.status(404).json({ error: "NOT_FOUND", message: "Application not found" });
      return;
    }
    if (!loaded.file) {
      res.status(404).json({ error: "NOT_FOUND", message: "CV file is missing" });
      return;
    }
    if (loaded.file.body.length < 1024) {
      res.status(422).json({ error: "INVALID_FILE", message: "CV file is empty or invalid" });
      return;
    }
    const inline = req.query.download !== "1";
    res.setHeader("Content-Type", loaded.file.contentType);
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename="${loaded.file.filename.replace(/"/g, "")}"`,
    );
    res.setHeader("Cache-Control", "private, max-age=60");
    res.send(loaded.file.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/applications/:id", async (req, res) => {
  try {
    const row = await getCareerApplication(req.params.id);
    if (!row) {
      res.status(404).json({ error: "NOT_FOUND", message: "Application not found" });
      return;
    }
    res.json(toPublicApplication(row));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/applications/:id/shortlist", async (req, res) => {
  try {
    const startsAt = typeof req.body?.starts_at === "string" ? req.body.starts_at : "";
    if (!startsAt.trim()) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "starts_at is required (IST wall time)" });
      return;
    }
    const result = await shortlistCareerApplication(req.params.id, req.auth!.sub, {
      startsAt,
      durationMin: req.body?.duration_min,
      note: typeof req.body?.note === "string" ? req.body.note : null,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: "SHORTLIST_FAILED", message: result.message });
      return;
    }
    res.json({
      ...toPublicApplication(result.application),
      meet_created: result.meet_created,
      calendar_error: result.calendar_error,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/applications/:id/reject", async (req, res) => {
  try {
    const sendMail = req.body?.send_email !== false;
    const result = await rejectCareerApplication(req.params.id, {
      sendEmail: sendMail,
      note: typeof req.body?.note === "string" ? req.body.note : null,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: "REJECT_FAILED", message: result.message });
      return;
    }
    res.json({
      ...toPublicApplication(result.application),
      email_sent: result.email_sent,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.patch("/applications/:id", async (req, res) => {
  try {
    const status = req.body?.status;
    if (status !== "new") {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Use POST /shortlist or POST /reject. PATCH only restores status to new.",
      });
      return;
    }
    const row = await setCareerApplicationStatus(req.params.id, status);
    if (!row) {
      res.status(404).json({ error: "NOT_FOUND", message: "Application not found" });
      return;
    }
    res.json(toPublicApplication(row));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
