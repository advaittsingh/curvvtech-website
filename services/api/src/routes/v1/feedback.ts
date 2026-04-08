import { Router } from "express";
import { pool } from "../../db.js";

export const feedbackRouter = Router();

feedbackRouter.post("/feedback", async (req, res) => {
  const userId = req.internalUser!.id;
  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const appVersion = typeof req.body?.app_version === "string" ? req.body.app_version : null;
  const platform = typeof req.body?.platform === "string" ? req.body.platform : null;

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    await pool.query(
      `INSERT INTO feedback (user_id, subject, message, app_version, platform)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, subject, message, appVersion, platform]
    );
    return res.status(201).json({ ok: true });
  } catch (e) {
    req.log?.error({ err: e }, "feedback");
    return res.status(500).json({ error: "Could not save feedback" });
  }
});
