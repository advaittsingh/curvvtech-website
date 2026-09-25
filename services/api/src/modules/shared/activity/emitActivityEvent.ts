import { sql, firstRow } from "../../../lib/sqlPool.js";
import { logger } from "../../../logger.js";
import { createNotificationsFromEvent } from "../notifications/notificationService.js";

export type ActivityVisibility = "internal" | "client" | "private";

export type ActivityEventInput = {
  organizationId: string;
  clientId?: string | null;
  projectId?: string | null;
  actorType: "staff" | "client" | "system" | "ai";
  actorId?: string | null;
  actorName?: string | null;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
  visibility?: ActivityVisibility;
};

export type ActivityEventRow = {
  id: string;
  organization_id: string;
  client_id: string | null;
  project_id: string | null;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  body: string | null;
  metadata_json: Record<string, unknown>;
  visibility: ActivityVisibility;
  created_at: string;
};

/**
 * Central event emitter. Writes activity_events, then fans out to client
 * notifications (for client-visible events). Never throws — logs and continues.
 */
export async function emitActivityEvent(input: ActivityEventInput): Promise<ActivityEventRow | null> {
  try {
    const row = firstRow<ActivityEventRow>(
      await sql`
        INSERT INTO activity_events (
          organization_id, client_id, project_id,
          actor_type, actor_id, actor_name,
          event_type, entity_type, entity_id,
          title, body, metadata_json, visibility
        ) VALUES (
          ${input.organizationId}, ${input.clientId ?? null}, ${input.projectId ?? null},
          ${input.actorType}, ${input.actorId ?? null}, ${input.actorName ?? null},
          ${input.eventType}, ${input.entityType ?? null}, ${input.entityId ?? null},
          ${input.title}, ${input.body ?? null},
          ${JSON.stringify(input.metadata ?? {})}::jsonb, ${input.visibility ?? "internal"}
        )
        RETURNING *
      `,
    );
    if (row && row.visibility === "client" && row.client_id) {
      await createNotificationsFromEvent(row).catch((e) =>
        logger.warn({ err: e }, "notification_from_event_failed"),
      );
    }
    return row;
  } catch (e) {
    logger.warn({ err: e, eventType: input.eventType }, "emit_activity_event_failed");
    return null;
  }
}

type ScopedActivityInput = Omit<ActivityEventInput, "organizationId" | "clientId" | "actorType"> & {
  actorType?: ActivityEventInput["actorType"];
};

/**
 * Emit an activity event for a project, resolving the project's organization +
 * client automatically. Defaults to client-visible so it lands in the client
 * journal/timeline. No-ops silently if the project has no linked client/org.
 */
export async function emitProjectActivity(
  projectId: string,
  input: ScopedActivityInput,
): Promise<ActivityEventRow | null> {
  try {
    const proj = firstRow<{ organization_id: string | null; client_id: string | null }>(
      await sql`SELECT organization_id, client_id FROM projects WHERE id = ${projectId} LIMIT 1`,
    );
    if (!proj?.organization_id || !proj?.client_id) return null;
    return await emitActivityEvent({
      ...input,
      organizationId: proj.organization_id,
      clientId: proj.client_id,
      projectId,
      actorType: input.actorType ?? "staff",
      visibility: input.visibility ?? "client",
    });
  } catch (e) {
    logger.warn({ err: e, eventType: input.eventType }, "emit_project_activity_failed");
    return null;
  }
}

/**
 * Emit an activity event for a client, resolving the client's organization
 * automatically. Defaults to client-visible. No-ops if the client has no org.
 */
export async function emitClientActivity(
  clientId: string,
  input: ScopedActivityInput,
): Promise<ActivityEventRow | null> {
  try {
    const c = firstRow<{ organization_id: string | null }>(
      await sql`SELECT organization_id FROM clients WHERE id = ${clientId} LIMIT 1`,
    );
    if (!c?.organization_id) return null;
    return await emitActivityEvent({
      ...input,
      organizationId: c.organization_id,
      clientId,
      actorType: input.actorType ?? "staff",
      visibility: input.visibility ?? "client",
    });
  } catch (e) {
    logger.warn({ err: e, eventType: input.eventType }, "emit_client_activity_failed");
    return null;
  }
}

export async function getClientTimeline(
  organizationId: string,
  clientId: string,
  opts: { projectId?: string; limit?: number } = {},
): Promise<ActivityEventRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  if (opts.projectId) {
    return (await sql`
      SELECT * FROM activity_events
      WHERE organization_id = ${organizationId}
        AND client_id = ${clientId}
        AND project_id = ${opts.projectId}
        AND visibility = 'client'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as ActivityEventRow[];
  }
  return (await sql`
    SELECT * FROM activity_events
    WHERE organization_id = ${organizationId}
      AND client_id = ${clientId}
      AND visibility = 'client'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as ActivityEventRow[];
}
