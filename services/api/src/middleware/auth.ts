import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { pool } from "../db.js";
import { logger } from "../logger.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";
import { getUserById } from "../modules/auth/auth.service.js";
import { ensureUser } from "../services/userService.js";
import type { AuthPayload } from "../types.js";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    if (config.skipAuth) {
      req.auth = {
        sub: config.devAuthSub,
        email: config.devAuthEmail,
        tokenUse: "dev",
      };
      req.internalUser = await ensureUser(pool, req.auth);
      return next();
    }

    if (!config.jwtAccessSecret) {
      logger.error("JWT_SECRET is not set; cannot verify requests");
      return res.status(503).json({ error: "AUTH_NOT_CONFIGURED", message: "Server authentication is not configured" });
    }

    const h = req.headers.authorization;
    const token = typeof h === "string" && h.startsWith("Bearer ") ? h.slice(7).trim() : "";
    if (!token) {
      return res.status(401).json({
        error: "MISSING_BEARER",
        message: "Authorization header must be: Bearer <access_token>",
      });
    }

    let claims: { sub: string; email?: string };
    try {
      claims = verifyAccessToken(token, config.jwtAccessSecret);
    } catch {
      return res.status(401).json({
        error: "INVALID_TOKEN",
        message: "Invalid or expired access token",
      });
    }

    const user = await getUserById(pool, claims.sub);
    if (!user) {
      return res.status(401).json({
        error: "INVALID_TOKEN",
        message: "Invalid or expired access token",
      });
    }

    const auth: AuthPayload = {
      sub: user.id,
      email: user.email ?? claims.email,
      tokenUse: "access",
    };
    req.auth = auth;
    req.internalUser = user;
    return next();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    logger.warn({ err: msg }, "auth_failed");
    return res.status(401).json({
      error: "INVALID_TOKEN",
      message: "Invalid or expired access token",
    });
  }
}
