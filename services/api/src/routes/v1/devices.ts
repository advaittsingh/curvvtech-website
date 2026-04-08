import { Router } from "express";
import { pool } from "../../db.js";

export const devicesRouter = Router();

devicesRouter.post("/devices", async (req, res) => {
  const userId = req.internalUser!.id;
  const fcm = typeof req.body?.fcm_token === "string" ? req.body.fcm_token.trim() : null;
  const apns = typeof req.body?.apns_token === "string" ? req.body.apns_token.trim() : null;
  const platform = typeof req.body?.platform === "string" ? req.body.platform.trim() : null;

  if (!fcm && !apns) {
    return res.status(400).json({ error: "fcm_token or apns_token is required" });
  }

  try {
    await pool.query(
      `INSERT INTO devices (user_id, fcm_token, apns_token, platform)
       VALUES ($1, $2, $3, $4)`,
      [userId, fcm, apns, platform]
    );
    return res.status(201).json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return res.status(409).json({ error: "Token already registered for this user" });
    }
    req.log?.error({ err: e }, "devices");
    return res.status(500).json({ error: "Could not register device" });
  }
});
