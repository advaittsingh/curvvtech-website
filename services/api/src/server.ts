import "./loadEnv.js";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { logger } from "./logger.js";
import type { Socket } from "socket.io";
import { setChatSocket } from "./modules/curvvtech/chatSocket.js";
import { startCallWorker } from "./workers/callWorker.js";
import { attachTwilioMediaStreamServer } from "./services/twilio/mediaStreamServer.js";
import { verifyAccessToken } from "./modules/auth/auth.tokens.js";
import { verifyClientAccessToken } from "./modules/client-portal/clientTokens.js";

/** UUID v4 (PostgreSQL gen_random_uuid-style) for conversation room names. */
const CONVERSATION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isConversationUuid(value: unknown): value is string {
  return typeof value === "string" && CONVERSATION_UUID_RE.test(value);
}

function leaveConversationRooms(socket: Socket) {
  for (const room of socket.rooms) {
    if (room !== socket.id && room.startsWith("conversation:")) {
      void socket.leave(room);
    }
  }
}

if (!config.databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

if (!config.skipAuth && config.nodeEnv === "production" && !config.jwtAccessSecret?.trim()) {
  console.error("Production requires JWT_SECRET when SKIP_AUTH is false");
  process.exit(1);
}

logger.info(
  {
    nodeEnv: config.nodeEnv,
    port: config.port,
    skipAuth: config.skipAuth,
    redisConfigured: Boolean(config.redisUrl),
    s3Configured: Boolean(config.s3Bucket),
  },
  "curvvtech_api_boot"
);

const app = createApp();
const server = http.createServer(app);
attachTwilioMediaStreamServer(server);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  const q = socket.handshake.query?.conversationId;
  const convId =
    typeof q === "string"
      ? q.trim()
      : Array.isArray(q) && typeof q[0] === "string"
        ? q[0].trim()
        : undefined;
  if (isConversationUuid(convId)) {
    socket.join(`conversation:${convId}`);
  }

  /** Client Portal: authenticated sockets join their client + project rooms. */
  const clientToken =
    typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : "";
  if (clientToken && config.clientJwtSecret) {
    try {
      const claims = verifyClientAccessToken(clientToken, config.clientJwtSecret);
      if (claims.client_id) socket.join(`client:${claims.client_id}`);
    } catch {
      /* Not a client token — try admin staff JWT for inbox badge room. */
      if (config.jwtAccessSecret) {
        try {
          verifyAccessToken(clientToken, config.jwtAccessSecret);
          socket.join("admin:inbox");
        } catch {
          /* unauthenticated socket */
        }
      }
    }
  } else if (clientToken && config.jwtAccessSecret) {
    try {
      verifyAccessToken(clientToken, config.jwtAccessSecret);
      socket.join("admin:inbox");
    } catch {
      /* unauthenticated socket */
    }
  }

  socket.on("join_project", (id: unknown) => {
    const pid = typeof id === "string" ? id.trim() : "";
    if (isConversationUuid(pid)) socket.join(`project:${pid}`);
  });

  socket.on("join_conversation", (id: unknown) => {
    const sid = typeof id === "string" ? id.trim() : "";
    if (!isConversationUuid(sid)) return;
    leaveConversationRooms(socket);
    socket.join(`conversation:${sid}`);
    logger.debug({ socketId: socket.id, conversationId: sid }, "socket_join_conversation");
  });

  socket.on("leave_conversations", () => {
    leaveConversationRooms(socket);
  });
});

setChatSocket(io);

server.listen(config.port, config.host, () => {
  logger.info({ port: config.port, host: config.host }, "listening");
});

if (config.aiCallWorkerEnabled) {
  try {
    startCallWorker();
  } catch (e) {
    logger.error(
      { err: e instanceof Error ? e.message : String(e) },
      "ai_call_worker_failed_to_start"
    );
  }
}

async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
