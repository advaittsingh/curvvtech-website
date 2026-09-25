import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import authRouter from "./auth.routes.js";
import portalRouter from "./portal.routes.js";
import { requireClientAuth, enforceClientPermissions } from "./clientAuth.middleware.js";
import { resolveBrandingByHost } from "../shared/organizations/organizationService.js";

const router = Router();

// Public: branding resolution by host (white-label) — no auth.
router.get(
  "/branding",
  asyncHandler(async (req, res) => {
    const host = (req.headers["x-portal-host"] as string) || req.headers.host;
    const resolved = await resolveBrandingByHost(host);
    res.json(resolved);
  }),
);

// Public: auth (login, refresh, invite, password reset).
router.use("/auth", authRouter);

// Everything else requires a valid client JWT + permission checks.
router.use(requireClientAuth, enforceClientPermissions, portalRouter);

export const clientPortalRouter = router;
export default router;
