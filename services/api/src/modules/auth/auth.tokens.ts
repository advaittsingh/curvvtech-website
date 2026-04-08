import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export type AccessClaims = { sub: string; email?: string };

export function signAccessToken(
  userId: string,
  email: string | null,
  secret: string,
  expiresInSec: number
): string {
  return jwt.sign(
    { sub: userId, email: email ?? undefined },
    secret,
    { algorithm: "HS256", expiresIn: expiresInSec }
  );
}

export function verifyAccessToken(token: string, secret: string): AccessClaims {
  const p = jwt.verify(token, secret) as jwt.JwtPayload;
  const sub = typeof p.sub === "string" ? p.sub : "";
  if (!sub) throw new Error("Invalid access token");
  return {
    sub,
    email: typeof p.email === "string" ? p.email : undefined,
  };
}

/** Opaque refresh: `{userId}.{random}` — lookup user by id, then bcrypt.compare full string. */
export function createRefreshPlain(userId: string): string {
  return `${userId}.${crypto.randomBytes(32).toString("hex")}`;
}

export async function hashRefreshToken(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyRefreshPlain(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
