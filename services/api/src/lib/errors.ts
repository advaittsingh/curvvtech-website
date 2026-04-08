/** Application errors → HTTP responses (centralized handler). */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "INTERNAL"
  | "RATE_LIMITED";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    options?: { cause?: unknown; details?: unknown }
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = options?.details;
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new AppError(400, "VALIDATION_ERROR", msg, { details });

export const forbidden = (msg = "Forbidden") => new AppError(403, "FORBIDDEN", msg);

export const notFound = (msg = "Not found") => new AppError(404, "NOT_FOUND", msg);

export const conflict = (msg: string) => new AppError(409, "CONFLICT", msg);

export const unauthorized = (msg = "Unauthorized") => new AppError(401, "UNAUTHORIZED", msg);
