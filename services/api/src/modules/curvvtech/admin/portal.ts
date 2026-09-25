import { Router } from "express";
import type { Request } from "express";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import { asyncHandler } from "../../../lib/asyncHandler.js";
import { badRequest, notFound } from "../../../lib/errors.js";
import { config } from "../../../config.js";
import { randomToken } from "../../client-portal/clientTokens.js";
import { normalizeClientRole } from "../../../lib/clientPermissions.js";
import { sendClientEmail } from "../../shared/communications/emailService.js";
import { emitActivityEvent } from "../../shared/activity/emitActivityEvent.js";
import {
  buildInviteEmail,
  formatInviteContractValue,
  formatPortalRole,
  renderInviteEmail,
} from "../../../templates/email/inviteEmailTemplate.js";

const router = Router();

function actorOf(req: Request): { id: string; name: string } {
  return { id: req.auth?.sub ?? "system", name: req.auth?.email ?? "Staff" };
}

/** Invite (or re-invite) a client user to the portal. */
router.post(
  "/clients/:clientId/invite",
  asyncHandler(async (req, res) => {
    const clientId = String(req.params.clientId);
    const { email, name, role } = req.body as { email?: string; name?: string; role?: string };

    const client = firstRow<{
      id: string;
      organization_id: string | null;
      email: string | null;
      name: string;
      company: string | null;
      industry: string | null;
      contract_value_cents: number | null;
    }>(
      await sql`SELECT id, organization_id, email, name, company, industry, contract_value_cents FROM clients WHERE id = ${clientId} LIMIT 1`,
    );
    if (!client) throw notFound("Client not found");
    const orgId = client.organization_id;
    if (!orgId) throw badRequest("Client has no organization");
    const inviteEmail = (email ?? client.email ?? "").trim().toLowerCase();
    if (!inviteEmail) throw badRequest("Email required");

    const token = randomToken();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const clientRole = normalizeClientRole(role ?? "owner");

    const existing = firstRow<{ id: string }>(
      await sql`SELECT id FROM client_users WHERE organization_id = ${orgId} AND lower(email) = ${inviteEmail} LIMIT 1`,
    );

    let userId: string;
    if (existing) {
      await sql`
        UPDATE client_users
        SET invite_token = ${token}, invite_expires_at = ${expires}, status = 'invited',
            role = ${clientRole}, name = COALESCE(NULLIF(${name ?? ""}, ''), name), updated_at = now()
        WHERE id = ${existing.id}
      `;
      userId = existing.id;
    } else {
      const row = firstRow<{ id: string }>(
        await sql`
          INSERT INTO client_users (organization_id, client_id, email, name, role, status, invite_token, invite_expires_at)
          VALUES (${orgId}, ${clientId}, ${inviteEmail}, ${name ?? client.name ?? ""}, ${clientRole}, 'invited', ${token}, ${expires})
          RETURNING id
        `,
      );
      userId = row!.id;
    }

    await sql`UPDATE clients SET portal_status = 'invited' WHERE id = ${clientId}`;

    const link = `${config.clientPortalUrl}/invite/${token}`;

    const stats = firstRow<{ project_count: number; contract_total_cents: number }>(
      await sql`
        SELECT
          COUNT(*)::int AS project_count,
          COALESCE(SUM(COALESCE(quoted_cents, budget_cents, 0)), 0)::bigint AS contract_total_cents
        FROM projects
        WHERE client_id = ${clientId}
      `,
    );
    const logoRow = firstRow<{ logo_url: string | null }>(
      await sql`SELECT logo_url FROM company_settings WHERE organization_id = ${orgId} LIMIT 1`,
    );

    const inviteVars = {
      clientName: name ?? client.name ?? "there",
      companyName: client.company ?? client.name ?? "Your company",
      industry: client.industry ?? "Business",
      projectCount: stats?.project_count ?? 0,
      contractValue: formatInviteContractValue(
        client.contract_value_cents ?? stats?.contract_total_cents ?? 0,
      ),
      portalRole: formatPortalRole(clientRole),
      inviteUrl: link,
    };

    const customLogo = logoRow?.logo_url?.trim();
    const inviteBundle = customLogo
      ? { html: renderInviteEmail({ ...inviteVars, logoUrl: customLogo }), attachments: [] }
      : buildInviteEmail(inviteVars);

    const emailSent = await sendClientEmail({
      organizationId: orgId,
      to: inviteEmail,
      subject: "You're invited to your curvvtech Client Portal",
      html: inviteBundle.html,
      attachments: inviteBundle.attachments,
    });

    const actor = actorOf(req);
    await emitActivityEvent({
      organizationId: orgId,
      clientId,
      actorType: "staff",
      actorId: actor.id,
      actorName: actor.name,
      eventType: "client.invited",
      entityType: "client",
      entityId: clientId,
      title: "Portal invite sent",
      body: inviteEmail,
      visibility: "internal",
    });

    res.status(201).json({ ok: true, client_user_id: userId, email_sent: emailSent, invite_link: link });
  }),
);

const PUBLISHABLE: Record<string, string> = {
  file: "files",
  milestone: "milestones",
  task: "tasks",
  revision: "project_revisions",
  change_order: "project_change_orders",
  scope: "project_scope_items",
};

/** Publish an entity to the client (visibility = 'client'). */
router.post(
  "/publish/:entityType/:entityId",
  asyncHandler(async (req, res) => {
    const entityType = String(req.params.entityType);
    const entityId = String(req.params.entityId);
    const table = PUBLISHABLE[entityType];
    if (!table) throw badRequest("Unsupported entity type");
    const actor = actorOf(req);

    let updated: { id: string; client_id?: string | null; project_id?: string | null; organization_id?: string | null } | null = null;

    if (entityType === "file") {
      updated = firstRow(
        await sql`
          UPDATE files SET visibility = 'client', published_at = now(), published_by_user_id = ${actor.id}
          WHERE id = ${entityId} RETURNING id, client_id, project_id, organization_id
        `,
      );
    } else if (entityType === "milestone") {
      updated = firstRow(
        await sql`
          UPDATE milestones SET visibility = 'client', published_at = now(), published_by_user_id = ${actor.id}
          WHERE id = ${entityId} RETURNING id, project_id
        `,
      );
    } else if (entityType === "task") {
      updated = firstRow(
        await sql`
          UPDATE tasks SET visibility = 'client', published_at = now(), published_by_user_id = ${actor.id}
          WHERE id = ${entityId} RETURNING id, project_id, organization_id
        `,
      );
    } else if (entityType === "revision") {
      updated = firstRow(
        await sql`
          UPDATE project_revisions SET visibility = 'client', published_at = now(), published_by_user_id = ${actor.id}
          WHERE id = ${entityId} RETURNING id, project_id
        `,
      );
    } else if (entityType === "change_order") {
      updated = firstRow(
        await sql`
          UPDATE project_change_orders SET visibility = 'client', published_at = now(), published_by_user_id = ${actor.id}
          WHERE id = ${entityId} RETURNING id, project_id
        `,
      );
    } else if (entityType === "scope") {
      updated = firstRow(
        await sql`UPDATE project_scope_items SET visibility = 'client' WHERE id = ${entityId} RETURNING id, project_id`,
      );
    }

    if (!updated) throw notFound("Entity not found");

    // Resolve org + client for the activity event.
    let orgId = updated.organization_id ?? null;
    let clientId = updated.client_id ?? null;
    const projectId = updated.project_id ?? null;
    if ((!orgId || !clientId) && projectId) {
      const proj = firstRow<{ organization_id: string; client_id: string }>(
        await sql`SELECT organization_id, client_id FROM projects WHERE id = ${projectId} LIMIT 1`,
      );
      orgId = orgId ?? proj?.organization_id ?? null;
      clientId = clientId ?? proj?.client_id ?? null;
    }

    if (orgId && clientId) {
      await emitActivityEvent({
        organizationId: orgId,
        clientId,
        projectId,
        actorType: "staff",
        actorId: actor.id,
        actorName: actor.name,
        eventType: `${entityType}.published`,
        entityType,
        entityId,
        title: `${entityType.replace("_", " ")} published to client`,
        visibility: "client",
      });
    }

    res.json({ ok: true });
  }),
);

export default router;
