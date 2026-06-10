import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "../config.js";

export type CallJob = {
  crmLeadId: string;
  /** Optional override; when absent, worker reads from DB. */
  toE164?: string;
  /** For future: schedule call at/after time. */
  notBeforeIso?: string;
};

export const CALL_QUEUE_NAME = "ai-calls";

function requireRedisUrl() {
  if (!config.redisUrl?.trim()) {
    throw new Error("REDIS_URL is required for AI call queue/worker");
  }
  return config.redisUrl.trim();
}

export function createCallQueue() {
  const connection = new Redis(requireRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  return new Queue<CallJob>(CALL_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: config.aiCallMaxAttempts,
      backoff: { type: "exponential", delay: 60_000 },
    },
  });
}

let queueSingleton: Queue<CallJob> | null = null;

export function callQueue(): Queue<CallJob> {
  if (!queueSingleton) queueSingleton = createCallQueue();
  return queueSingleton;
}

export async function enqueueCall(crmLeadId: string, opts?: Partial<CallJob>) {
  await callQueue().add(
    "call-lead",
    { crmLeadId, ...opts },
    {
      jobId: `crm:${crmLeadId}`,
      delay: opts?.notBeforeIso
        ? Math.max(0, new Date(opts.notBeforeIso).getTime() - Date.now())
        : 0,
    }
  );
}

export async function enqueueBulk(crmLeadIds: string[], opts?: Partial<CallJob>) {
  const jobs = crmLeadIds.map((id) => ({
    name: "call-lead",
    data: { crmLeadId: id, ...opts },
    opts: { jobId: `crm:${id}` },
  }));
  await callQueue().addBulk(jobs);
}

