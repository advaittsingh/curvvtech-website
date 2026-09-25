import "../src/loadEnv.js";
import { createApp } from "../src/app.js";

/**
 * Vercel serverless entry. Do not import `src/server.ts` here — that starts
 * a long-lived HTTP + Socket.IO process which Vercel cannot host.
 */
const app = createApp();

/** Keep the multipart stream intact so career CV uploads are not consumed first. */
export const config = {
  api: { bodyParser: false },
};

export default app;
