import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimitPerMinute(limit: number, keyFn: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + 60_000 };
      buckets.set(key, b);
    }
    b.count += 1;
    if (b.count > limit) {
      return res.status(429).json({ error: "Too many requests" });
    }
    next();
  };
}
