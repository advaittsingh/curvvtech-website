import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { ClientRole } from "../../lib/clientPermissions.js";

export type ClientAccessClaims = {
  sub: string; // client_users.id
  email: string;
  typ: "client";
  org_id: string;
  client_id: string;
  role: ClientRole;
};

export function signClientAccessToken(
  claims: Omit<ClientAccessClaims, "typ">,
  secret: string,
  expiresInSec: number,
): string {
  return jwt.sign(
    { ...claims, typ: "client" },
    secret,
    { algorithm: "HS256", expiresIn: expiresInSec },
  );
}

export function verifyClientAccessToken(token: string, secret: string): ClientAccessClaims {
  const p = jwt.verify(token, secret) as jwt.JwtPayload;
  if (p.typ !== "client") throw new Error("Not a client token");
  const sub = typeof p.sub === "string" ? p.sub : "";
  if (!sub) throw new Error("Invalid client token");
  return {
    sub,
    email: typeof p.email === "string" ? p.email : "",
    typ: "client",
    org_id: typeof p.org_id === "string" ? p.org_id : "",
    client_id: typeof p.client_id === "string" ? p.client_id : "",
    role: (typeof p.role === "string" ? p.role : "viewer") as ClientRole,
  };
}

/** Opaque refresh: `{clientUserId}.{random}`. */
export function createClientRefreshPlain(clientUserId: string): string {
  return `${clientUserId}.${crypto.randomBytes(32).toString("hex")}`;
}

export async function hashClientRefreshToken(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyClientRefreshPlain(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function hashClientPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyClientPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
