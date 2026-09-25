import { randomUUID } from "node:crypto";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import { emitActivityEvent } from "../../shared/activity/emitActivityEvent.js";

export const APPROVAL_ENTITY_TYPES = [
  "design",
  "frontend",
  "change",
  "milestone",
  "file",
  "change_order",
  "revision",
  "scope",
  "deliverable",
  "invoice",
  "other",
] as const;

export type ApprovalEntityType = (typeof APPROVAL_ENTITY_TYPES)[number];

export type ApprovalRequestRow = {
  id: string;
  organization_id: string;
  client_id: string;
  project_id: string | null;
  entity_type: string;
  entity_id: string;
  title: string;
  description: string | null;
  review_url: string | null;
  status: string;
  decided_at: string | null;
  comment: string | null;
  visibility: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function approvalTypeLabel(entityType: string): string {
  const labels: Record<string, string> = {
    design: "Design review",
    frontend: "Site / frontend update",
    change: "Changes made",
    milestone: "Milestone",
    file: "File / document",
    change_order: "Change order",
    revision: "Revision",
    scope: "Scope item",
    deliverable: "Deliverable",
    invoice: "Invoice",
    other: "Approval",
  };
  return labels[entityType] ?? entityType.replace(/_/g, " ");
}

export async function listApprovalRequests(opts: {
  organizationId?: string;
  projectId?: string;
  clientId?: string;
  status?: string;
  limit?: number;
}): Promise<ApprovalRequestRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  if (opts.projectId) {
    if (opts.status) {
      return (await sql`
        SELECT * FROM approval_requests
        WHERE project_id = ${opts.projectId}::uuid
          AND status = ${opts.status}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as ApprovalRequestRow[];
    }
    return (await sql`
      SELECT * FROM approval_requests
      WHERE project_id = ${opts.projectId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as ApprovalRequestRow[];
  }
  if (opts.clientId) {
    if (opts.status) {
      return (await sql`
        SELECT * FROM approval_requests
        WHERE client_id = ${opts.clientId}::uuid
          AND status = ${opts.status}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as ApprovalRequestRow[];
    }
    return (await sql`
      SELECT * FROM approval_requests
      WHERE client_id = ${opts.clientId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as ApprovalRequestRow[];
  }
  if (opts.organizationId) {
    if (opts.status) {
      return (await sql`
        SELECT * FROM approval_requests
        WHERE organization_id = ${opts.organizationId}
          AND status = ${opts.status}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as ApprovalRequestRow[];
    }
    return (await sql`
      SELECT * FROM approval_requests
      WHERE organization_id = ${opts.organizationId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as ApprovalRequestRow[];
  }
  if (opts.status) {
    return (await sql`
      SELECT * FROM approval_requests
      WHERE status = ${opts.status}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as ApprovalRequestRow[];
  }
  return (await sql`
    SELECT * FROM approval_requests
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as ApprovalRequestRow[];
}

export async function createApprovalRequest(input: {
  organizationId: string;
  clientId: string;
  projectId?: string | null;
  entityType: string;
  entityId?: string | null;
  title: string;
  description?: string | null;
  reviewUrl?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
}): Promise<ApprovalRequestRow> {
  const entityType = APPROVAL_ENTITY_TYPES.includes(input.entityType as ApprovalEntityType)
    ? input.entityType
    : "other";
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  const entityId = input.entityId?.trim() || randomUUID();
  const reviewUrl = input.reviewUrl?.trim() || null;

  const row = firstRow<ApprovalRequestRow>(
    await sql`
      INSERT INTO approval_requests (
        organization_id, client_id, project_id,
        entity_type, entity_id, title, description, review_url,
        status, visibility, created_by
      ) VALUES (
        ${input.organizationId},
        ${input.clientId},
        ${input.projectId ?? null},
        ${entityType},
        ${entityId}::uuid,
        ${title},
        ${input.description?.trim() || null},
        ${reviewUrl},
        'pending',
        'client',
        ${input.createdBy ?? null}
      )
      RETURNING *
    `,
  );
  if (!row) throw new Error("Failed to create approval request");

  await emitActivityEvent({
    organizationId: input.organizationId,
    clientId: input.clientId,
    projectId: input.projectId ?? null,
    actorType: "staff",
    actorId: input.createdBy ?? null,
    actorName: input.createdByName ?? "Your team",
    eventType: "approval.requested",
    entityType: "approval",
    entityId: row.id,
    title: `Approval needed: ${title}`,
    body: input.description?.trim() || approvalTypeLabel(entityType),
    metadata: { approval_id: row.id, entity_type: entityType, review_url: reviewUrl },
    visibility: "client",
  });

  return row;
}

export async function deleteApprovalRequest(
  organizationId: string,
  approvalId: string,
): Promise<boolean> {
  const row = firstRow<{ id: string }>(
    await sql`
      DELETE FROM approval_requests
      WHERE id = ${approvalId}::uuid
        AND organization_id = ${organizationId}
      RETURNING id
    `,
  );
  return Boolean(row);
}

export async function resolveApprovalContext(projectId?: string | null, clientId?: string | null) {
  if (projectId) {
    const p = firstRow<{ organization_id: string; client_id: string }>(
      await sql`SELECT organization_id, client_id FROM projects WHERE id = ${projectId}::uuid LIMIT 1`,
    );
    if (!p?.organization_id || !p?.client_id) throw new Error("Project not found or missing client");
    return { organizationId: p.organization_id, clientId: p.client_id, projectId };
  }
  if (clientId) {
    const c = firstRow<{ organization_id: string }>(
      await sql`SELECT organization_id FROM clients WHERE id = ${clientId}::uuid LIMIT 1`,
    );
    if (!c?.organization_id) throw new Error("Client not found");
    return { organizationId: c.organization_id, clientId, projectId: null as string | null };
  }
  throw new Error("project_id or client_id required");
}
