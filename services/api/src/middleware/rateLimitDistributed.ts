import type { NextFunction, Request, Response } from "express";
import { Redis } from "ioredis";
import { config } from "../config.js";

type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!config.redisUrl) return null;
  if (!redis) {
    redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 2, enableReadyCheck: true });
  }
  return redis;
}

/** Per-minute limit; uses Redis when REDIS_URL is set, else in-memory (single instance only). */
export function distributedRateLimitPerMinute(limit: number, keyFn: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rl:${keyFn(req)}`;
    const now = Date.now();
    const r = getRedis();

    if (r) {
      try {
        const k = `${key}:${Math.floor(now / 60_000)}`;
        const n = await r.incr(k);
        if (n === 1) await r.pexpire(k, 65_000);
        if (n > limit) {
          res.setHeader("Retry-After", "60");
          return res.status(429).json({ error: "RATE_LIMITED", message: "Too many requests" });
        }
        return next();
      } catch {
        /* fall through to memory */
      }
    }

    let b = memory.get(key);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + 60_000 };
      memory.set(key, b);
    }
    b.count += 1;
    if (b.count > limit) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "RATE_LIMITED", message: "Too many requests" });
    }
    next();
  };
}
