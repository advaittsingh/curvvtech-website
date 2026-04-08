import type { AuthPayload, InternalUser } from "./types.js";
import type pino from "pino";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
      internalUser?: InternalUser;
      tenantId?: string;
      tenantRole?: "admin" | "agent";
      reqId?: string;
      log?: pino.Logger;
      /** Raw body buffer (set by express.json verify) for Meta webhook signature checks */
      rawBody?: Buffer;
    }
  }
}

export {};
