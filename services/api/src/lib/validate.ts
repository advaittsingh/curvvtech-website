import type { ZodSchema } from "zod";
import type { Request, RequestHandler } from "express";
import { AppError } from "./errors.js";

type Target = "body" | "query" | "params";

export function validateRequest<T>(schema: ZodSchema<T>, target: Target = "body"): RequestHandler {
  return (req, _res, next) => {
    const raw = target === "body" ? req.body : target === "query" ? req.query : req.params;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return next(
        new AppError(400, "VALIDATION_ERROR", "Invalid request", {
          details: parsed.error.flatten(),
        })
      );
    }
    if (target === "body") req.body = parsed.data;
    else if (target === "query")
      (req as unknown as Request & { validatedQuery?: T }).validatedQuery = parsed.data;
    else (req as unknown as Request & { validatedParams?: T }).validatedParams = parsed.data;
    next();
  };
}
