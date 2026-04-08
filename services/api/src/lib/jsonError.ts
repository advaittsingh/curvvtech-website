import type { Response } from "express";

/** Consistent API error shape: `{ error, message }` for clients (e.g. followup-web `parseApiError`). */
export function jsonError(res: Response, status: number, error: string, message: string): void {
  res.status(status).json({ error, message });
}
