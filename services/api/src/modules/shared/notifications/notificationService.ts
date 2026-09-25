import { sql, firstRow } from "../../../lib/sqlPool.js";
import { logger } from "../../../logger.js";
import { emitToClientRoom } from "../../curvvtech/chatSocket.js";

type ActivityRowLite = {
  id: string;
  organization_id: string;
  client_id: string | null;
  project_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  body: string | null;
};

export type ClientNotificationRow = {
  id: string;
  organization_id: string;
  client_user_id: string | null;
  client_id: string;
  type: string;
  title: string;
  body: string;
  action_json: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

const TYPE_MAP: Record<string, string> = {
  "invoice.created": "invoice",
  "invoice.generated": "invoice",
  "invoice.sent": "invoice",
  "invoice.paid": "invoice",
  "invoice.overdue": "invoice",
  "invoice.reminder": "invoice",
  "milestone.completed": "task",
  "milestone.published": "task",
  "task.published": "task",
  "file.published": "file",
  "file.shared": "file",
  "project.phase_changed": "project",
  "project.completed": "project",
  "update.posted": "update",
  "approval.requested": "approval",
  "approval.approved": "approval",
  "approval.rejected": "approval",
  "message.sent": "message",
  "message.ai_replied": "message",
  "meeting.scheduled": "meeting",
};

function actionForEvent(row: ActivityRowLite): Record<string, unknown> {
  // Routes must map to pages that actually exist in the client portal — deep
  // links like /billing/invoices/:id or /approvals/:id 404, so we point at the
  // real workspace pages instead.
  switch (row.entity_type) {
    case "invoice":
      return { route: `/billing`, label: "View invoice" };
    case "project":
      return { route: `/project`, label: "View project" };
    case "file":
      return { route: `/project/files`, label: "View files" };
    case "milestone":
      return { route: `/project/milestones`, label: "View milestones" };
    case "approval":
      return { route: `/approvals`, label: "Review" };
    case "meeting":
      return { route: `/meetings`, label: "View meetings" };
    case "message":
    case "conversation":
      return { route: `/inbox`, label: "Open inbox" };
    default:
      return {};
  }
}

/** Create a broadcast notification for the client account from an activity event. */
export async function createNotificationsFromEvent(row: ActivityRowLite): Promise<void> {
  if (!row.client_id) return;
  const type = TYPE_MAP[row.event_type] ?? row.event_type.split(".")[0] ?? "system";
  const notif = firstRow<ClientNotificationRow>(
    await sql`
      INSERT INTO client_notifications (
        organization_id, client_user_id, client_id, type, title, body, action_json, activity_event_id
      ) VALUES (
        ${row.organization_id}, ${null}, ${row.client_id}, ${type},
        ${row.title}, ${row.body ?? ""}, ${JSON.stringify(actionForEvent(row))}::jsonb, ${row.id}
      )
      RETURNING *
    `,
  );
  if (notif) {
    emitToClientRoom(row.client_id, "notification", notif);
    emitToClientRoom(row.client_id, "activity", { event_type: row.event_type, title: row.title });
  }
}

export async function listClientNotifications(
  clientId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<ClientNotificationRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  if (opts.unreadOnly) {
    return (await sql`
      SELECT * FROM client_notifications
      WHERE client_id = ${clientId} AND read_at IS NULL
      ORDER BY created_at DESC LIMIT ${limit}
    `) as ClientNotificationRow[];
  }
  return (await sql`
    SELECT * FROM client_notifications
    WHERE client_id = ${clientId}
    ORDER BY created_at DESC LIMIT ${limit}
  `) as ClientNotificationRow[];
}

export async function markNotificationRead(clientId: string, id: string): Promise<void> {
  await sql`
    UPDATE client_notifications SET read_at = now()
    WHERE id = ${id} AND client_id = ${clientId} AND read_at IS NULL
  `;
}

export async function markAllNotificationsRead(clientId: string): Promise<void> {
  await sql`
    UPDATE client_notifications SET read_at = now()
    WHERE client_id = ${clientId} AND read_at IS NULL
  `;
}

export async function unreadCount(clientId: string): Promise<number> {
  const row = firstRow<{ count: string }>(
    await sql`SELECT COUNT(*)::int AS count FROM client_notifications WHERE client_id = ${clientId} AND read_at IS NULL`,
  );
  return Number(row?.count ?? 0);
}

export function logNotificationError(err: unknown): void {
  logger.warn({ err }, "client_notification_error");
}
