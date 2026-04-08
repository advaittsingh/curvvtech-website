import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { pool } from "../db.js";
import { logger } from "../logger.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";

const ADMIN_ROLES = ["admin", "manager"];

/** JWT access token + users.curvvtech_role must be admin or manager. */
export async function requireCurvvtechAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!config.jwtAccessSecret) {
      res.status(503).json({
        error: "AUTH_NOT_CONFIGURED",
        message: "Server authentication is not configured",
      });
      return;
    }
    const h = req.headers.authorization;
    const token =
      typeof h === "string" && h.startsWith("Bearer ") ? h.slice(7).trim() : "";
    if (!token) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authorization header must be: Bearer <access_token>",
      });
      return;
    }
    let sub: string;
    try {
      const claims = verifyAccessToken(token, config.jwtAccessSecret);
      sub = claims.sub;
    } catch {
      res.status(401).json({
        error: "INVALID_TOKEN",
        message: "Invalid or expired access token",
      });
      return;
    }

    const r = await pool.query<{
      id: string;
      email: string | null;
      curvvtech_role: string | null;
    }>(
      `SELECT id::text, email, curvvtech_role FROM users WHERE id = $1::uuid LIMIT 1`,
      [sub]
    );
    const row = r.rows[0];
    if (!row) {
      res.status(403).json({ error: "FORBIDDEN", message: "User not found" });
      return;
    }
    const role = (row.curvvtech_role ?? "").toLowerCase();
    if (!ADMIN_ROLES.includes(role)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: "Admin or manager role required",
      });
      return;
    }
    req.auth = {
      sub: row.id,
      email: row.email ?? undefined,
      tokenUse: "access",
    };
    next();
  } catch (e) {
    logger.warn({ err: e }, "curvvtech_admin_auth_failed");
    res.status(401).json({
      error: "INVALID_TOKEN",
      message: "Invalid or expired access token",
    });
  }
}
