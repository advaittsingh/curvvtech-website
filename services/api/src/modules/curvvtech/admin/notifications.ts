import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler.js";
import {
  adminNotificationUnreadCount,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../services/adminNotifications.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const unreadOnly = req.query.unread === "true";
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const notifications = await listAdminNotifications(auth.sub, {
      unreadOnly,
      limit,
      role: req.adminRole,
    });
    const unread_count = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unread_count });
  }),
);

router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const count = await adminNotificationUnreadCount(auth.sub, req.adminRole);
    res.json({ unread_count: count });
  }),
);

router.post(
  "/mark-read",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    await markAllAdminNotificationsRead(auth.sub, req.adminRole);
    res.json({ ok: true });
  }),
);

router.post(
  "/:key/read",
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    await markAdminNotificationRead(auth.sub, String(req.params.key));
    res.json({ ok: true });
  }),
);

export default router;
