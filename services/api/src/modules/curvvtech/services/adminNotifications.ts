import { sql } from "../../../lib/sqlPool.js";
import type { AdminRole } from "../../../lib/adminPermissions.js";

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  href: string | null;
  created_at: string;
  read: boolean;
};

const ADMIN_EVENT_TYPES = [
  "invoice.paid",
  "invoice.generated",
  "invoice.sent",
  "invoice.reminder",
  "invoice.overdue",
  "client.invited",
  "client.logged_in",
  "approval.requested",
  "approval.approved",
  "approval.rejected",
  "proposal.approved",
  "proposal.rejected",
  "revision.requested",
  "file.uploaded",
  "file.downloaded_by_client",
  "file.shared",
  "project.phase_changed",
  "project.completed",
  "milestone.completed",
  "update.posted",
  "message.sent",
  "task.assigned",
  "task.reassigned",
  "task.commented",
  "task.due_soon",
  "task.overdue",
];

function mapEventType(eventType: string): string {
  if (eventType.startsWith("invoice")) return "invoice";
  if (eventType.startsWith("proposal")) return "proposal";
  if (eventType.startsWith("client")) return "client";
  if (eventType.startsWith("approval")) return "approval";
  if (eventType.startsWith("project") || eventType.startsWith("milestone")) return "project";
  if (eventType.startsWith("file")) return "file";
  if (eventType.startsWith("revision")) return "revision";
  if (eventType.startsWith("demo")) return "demo";
  if (eventType.startsWith("task")) return "task";
  return "info";
}

function hrefForEvent(
  eventType: string,
  entityType: string | null,
  entityId: string | null,
  clientId: string | null,
): string | null {
  if (entityType === "invoice" && entityId) return `/invoices/${entityId}`;
  if (entityType === "client" && entityId) return `/clients/${entityId}`;
  if (entityType === "project" && entityId) return `/projects/${entityId}`;
  if (entityType === "proposal" && entityId) return `/proposals/${entityId}`;
  if (entityType === "approval" && entityId) return `/approvals`;
  if (entityType === "file" && entityId) return `/files`;
  if (entityType === "revision" && entityId) return `/projects`;
  if (entityType === "task" && entityId) return `/my-work?task_id=${entityId}`;
  if (eventType.startsWith("demo") && entityId) return `/demo-requests/${entityId}`;
  if (clientId) return `/clients/${clientId}`;
  return null;
}

function formatInr(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

async function ensureTaskDeadlineEvents(userId: string): Promise<void> {
  await sql`
    INSERT INTO activity_events (
      organization_id, client_id, project_id, actor_type, actor_name,
      event_type, entity_type, entity_id, title, body, metadata_json, visibility
    )
    SELECT
      t.organization_id, p.client_id, t.project_id, 'system', 'Curvvtech',
      CASE WHEN t.due_at < now() THEN 'task.overdue' ELSE 'task.due_soon' END,
      'task', t.id,
      CASE WHEN t.due_at < now()
        THEN 'Task overdue: ' || t.title
        ELSE 'Task due soon: ' || t.title
      END,
      'Due ' || to_char(t.due_at, 'Mon DD, YYYY HH24:MI'),
      jsonb_build_object(
        'recipient_user_id', ${userId}::text,
        'due_at', t.due_at::text
      ),
      'private'
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.assignee_user_id = ${userId}
      AND t.organization_id IS NOT NULL
      AND t.due_at IS NOT NULL
      AND t.status NOT IN ('done', 'cancelled')
      AND t.due_at < now() + interval '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM activity_events ae
        WHERE ae.entity_type = 'task'
          AND ae.entity_id = t.id
          AND ae.event_type = CASE WHEN t.due_at < now() THEN 'task.overdue' ELSE 'task.due_soon' END
          AND ae.metadata_json->>'recipient_user_id' = ${userId}
          AND ae.metadata_json->>'due_at' = t.due_at::text
      )
  `;
}

export async function listAdminNotifications(
  userId: string,
  opts: { limit?: number; unreadOnly?: boolean; role?: AdminRole | null } = {},
): Promise<AdminNotification[]> {
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);
  const restricted = opts.role === "designer" || opts.role === "developer";
  await ensureTaskDeadlineEvents(userId);

  const activityRows = (await sql`
    SELECT
      ae.id::text AS id,
      ae.event_type,
      ae.entity_type,
      ae.entity_id::text AS entity_id,
      ae.client_id::text AS client_id,
      ae.title,
      COALESCE(ae.body, '') AS body,
      ae.created_at::text AS created_at,
      snr.read_at IS NOT NULL AS read
    FROM activity_events ae
    LEFT JOIN staff_notification_reads snr
      ON snr.notification_key = ae.id::text AND snr.user_id = ${userId}
    WHERE ae.event_type = ANY(${ADMIN_EVENT_TYPES})
      AND (
        ae.event_type <> ALL(${["task.assigned", "task.reassigned", "task.commented", "task.due_soon", "task.overdue"]})
        OR ae.metadata_json->>'recipient_user_id' = ${userId}
      )
      AND (
        ${restricted}::boolean = false
        OR (
          ae.event_type = ANY(${["task.assigned", "task.reassigned", "task.commented", "task.due_soon", "task.overdue"]})
          AND ae.metadata_json->>'recipient_user_id' = ${userId}
        )
      )
    ORDER BY ae.created_at DESC
    LIMIT ${limit}
  `) as {
    id: string;
    event_type: string;
    entity_type: string | null;
    entity_id: string | null;
    client_id: string | null;
    title: string;
    body: string;
    created_at: string;
    read: boolean;
  }[];

  const demoRows = restricted ? [] : (await sql`
    SELECT
      ('demo:' || d.id::text) AS id,
      'demo.new' AS event_type,
      'demo_request' AS entity_type,
      d.id::text AS entity_id,
      NULL::text AS client_id,
      'New demo request' AS title,
      COALESCE(d.name, d.email, 'Inbound lead') || COALESCE(' · ' || NULLIF(d.company, ''), '') AS body,
      d.created_at::text AS created_at,
      snr.read_at IS NOT NULL AS read
    FROM demo_requests d
    LEFT JOIN staff_notification_reads snr
      ON snr.notification_key = ('demo:' || d.id::text) AND snr.user_id = ${userId}
    WHERE d.created_at >= NOW() - interval '30 days'
    ORDER BY d.created_at DESC
    LIMIT 10
  `) as typeof activityRows;

  const paymentRows = restricted ? [] : (await sql`
    SELECT
      ('payment:' || i.id::text) AS id,
      'invoice.paid' AS event_type,
      'invoice' AS entity_type,
      i.id::text AS entity_id,
      i.client_id::text AS client_id,
      'Payment received' AS title,
      COALESCE(c.company, c.name, 'Client') AS client_name,
      COALESCE(i.total_cents, i.amount_cents, 0)::bigint AS amount_cents,
      i.paid_at::text AS created_at,
      snr.read_at IS NOT NULL AS read
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    LEFT JOIN staff_notification_reads snr
      ON snr.notification_key = ('payment:' || i.id::text) AND snr.user_id = ${userId}
    WHERE i.status = 'paid' AND i.paid_at IS NOT NULL
      AND i.paid_at >= NOW() - interval '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM activity_events ae
        WHERE ae.event_type = 'invoice.paid' AND ae.entity_id = i.id
      )
    ORDER BY i.paid_at DESC
    LIMIT 8
  `) as {
    id: string;
    event_type: string;
    entity_type: string | null;
    entity_id: string | null;
    client_id: string | null;
    title: string;
    client_name: string;
    amount_cents: string | number;
    created_at: string;
    read: boolean;
  }[];

  const merged = new Map<string, AdminNotification>();

  for (const row of activityRows) {
    merged.set(row.id, {
      id: row.id,
      title: row.title,
      body: row.body,
      type: mapEventType(row.event_type),
      href: hrefForEvent(row.event_type, row.entity_type, row.entity_id, row.client_id),
      created_at: row.created_at,
      read: Boolean(row.read),
    });
  }

  for (const row of demoRows) {
    if (merged.has(row.id)) continue;
    merged.set(row.id, {
      id: row.id,
      title: row.title,
      body: row.body,
      type: "demo",
      href: hrefForEvent(row.event_type, row.entity_type, row.entity_id, row.client_id),
      created_at: row.created_at,
      read: Boolean(row.read),
    });
  }

  for (const row of paymentRows) {
    if (merged.has(row.id)) continue;
    merged.set(row.id, {
      id: row.id,
      title: row.title,
      body: `${row.client_name} · ${formatInr(Number(row.amount_cents))}`,
      type: "invoice",
      href: hrefForEvent(row.event_type, row.entity_type, row.entity_id, row.client_id),
      created_at: row.created_at,
      read: Boolean(row.read),
    });
  }

  let items = [...merged.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (opts.unreadOnly) {
    items = items.filter((n) => !n.read);
  }

  return items.slice(0, limit);
}

export async function adminNotificationUnreadCount(userId: string, role?: AdminRole | null): Promise<number> {
  const items = await listAdminNotifications(userId, { limit: 100, unreadOnly: true, role });
  return items.length;
}

export async function markAdminNotificationRead(userId: string, notificationKey: string): Promise<void> {
  await sql`
    INSERT INTO staff_notification_reads (user_id, notification_key)
    VALUES (${userId}, ${notificationKey})
    ON CONFLICT (user_id, notification_key) DO UPDATE SET read_at = now()
  `;
}

export async function markAllAdminNotificationsRead(userId: string, role?: AdminRole | null): Promise<void> {
  const items = await listAdminNotifications(userId, { limit: 100, role });
  const unread = items.filter((n) => !n.read);
  if (unread.length === 0) return;

  for (const item of unread) {
    await sql`
      INSERT INTO staff_notification_reads (user_id, notification_key)
      VALUES (${userId}, ${item.id})
      ON CONFLICT (user_id, notification_key) DO UPDATE SET read_at = now()
    `;
  }
}
