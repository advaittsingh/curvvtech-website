import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../../db.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as authService from "./auth.service.js";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10),
});

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  const { user, tokens } = await authService.signupWithPassword(
    pool,
    parsed.data.email,
    parsed.data.password
  );
  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      access_allowed: user.accessAllowed,
      waitlist_position: user.waitlistPosition,
    },
    ...tokens,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  const { user, tokens } = await authService.loginWithPassword(
    pool,
    parsed.data.email,
    parsed.data.password
  );
  res.json({
    user: {
      id: user.id,
      email: user.email,
      access_allowed: user.accessAllowed,
      waitlist_position: user.waitlistPosition,
    },
    ...tokens,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  const tokens = await authService.refreshSession(pool, parsed.data.refresh_token);
  res.json(tokens);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const uid = req.internalUser?.id;
  if (!uid) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }
  await authService.logoutUser(pool, uid);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const u = req.internalUser!;
  res.json({
    id: u.id,
    access_allowed: u.accessAllowed,
    waitlist_position: u.waitlistPosition,
    email: u.email,
  });
});
