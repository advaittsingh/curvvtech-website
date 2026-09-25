#!/usr/bin/env node
/**
 * Send (or resend) a Client Portal invite for a client record.
 * Usage:
 *   node scripts/send-client-portal-invite.mjs <clientId|client name substring>
 *   node scripts/send-client-portal-invite.mjs "Jaideep Singh Chahal"
 *   node scripts/send-client-portal-invite.mjs <clientId|name> [override-email]
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(apiRoot, ".env.aws"))) {
  loadEnv({ path: join(apiRoot, ".env.aws") });
} else {
  loadEnv({ path: join(apiRoot, ".env") });
}

const needle = (process.argv[2] || "").trim();
const emailOverride = (process.argv[3] || "").trim().toLowerCase();
if (!needle) {
  console.error("Usage: node scripts/send-client-portal-invite.mjs <clientId|name> [override-email]");
  process.exit(1);
}

const { sql, firstRow } = await import("../dist/lib/sqlPool.js");
const { randomToken } = await import("../dist/modules/client-portal/clientTokens.js");
const { normalizeClientRole } = await import("../dist/lib/clientPermissions.js");
const { sendClientEmail } = await import("../dist/modules/shared/communications/emailService.js");
const { emailConfigured } = await import("../dist/modules/shared/communications/mailer.js");
const {
  buildInviteEmail,
  formatInviteContractValue,
  formatPortalRole,
  renderInviteEmail,
} = await import("../dist/templates/email/inviteEmailTemplate.js");
const { config } = await import("../dist/config.js");

if (!emailConfigured()) {
  console.error("Email not configured. Set RESEND_API_KEY in services/api/.env.aws");
  process.exit(1);
}

const isUuid = /^[0-9a-f-]{36}$/i.test(needle);
const client = isUuid
  ? firstRow(
      await sql`
        SELECT id, organization_id, email, name, company, industry, contract_value_cents
        FROM clients WHERE id = ${needle}::uuid LIMIT 1
      `,
    )
  : firstRow(
      await sql`
        SELECT id, organization_id, email, name, company, industry, contract_value_cents
        FROM clients WHERE name ILIKE ${"%" + needle + "%"}
        ORDER BY "updatedAt" DESC LIMIT 1
      `,
    );

if (!client) {
  console.error(`Client not found for: ${needle}`);
  process.exit(1);
}

const orgId = client.organization_id;
if (!orgId) {
  console.error("Client has no organization_id");
  process.exit(1);
}

const inviteEmail = (emailOverride || String(client.email ?? "")).trim().toLowerCase();
if (!inviteEmail) {
  console.error("Client has no email on file (pass override as second argument)");
  process.exit(1);
}

const token = randomToken();
const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const clientRole = normalizeClientRole("owner");

const existing = firstRow(
  await sql`SELECT id FROM client_users WHERE organization_id = ${orgId} AND lower(email) = ${inviteEmail} LIMIT 1`,
);

if (existing) {
  await sql`
    UPDATE client_users
    SET invite_token = ${token}, invite_expires_at = ${expires}, status = 'invited',
        role = ${clientRole}, name = COALESCE(NULLIF(${client.name ?? ""}, ''), name), updated_at = now()
    WHERE id = ${existing.id}
  `;
} else {
  await sql`
    INSERT INTO client_users (organization_id, client_id, email, name, role, status, invite_token, invite_expires_at)
    VALUES (${orgId}, ${client.id}, ${inviteEmail}, ${client.name ?? ""}, ${clientRole}, 'invited', ${token}, ${expires})
  `;
}

await sql`UPDATE clients SET portal_status = 'invited' WHERE id = ${client.id}`;

const link = `${config.clientPortalUrl}/invite/${token}`;

const stats = firstRow(
  await sql`
    SELECT
      COUNT(*)::int AS project_count,
      COALESCE(SUM(COALESCE(quoted_cents, budget_cents, 0)), 0)::bigint AS contract_total_cents
    FROM projects
    WHERE client_id = ${client.id}
  `,
);

const logoRow = firstRow(
  await sql`SELECT logo_url FROM company_settings WHERE organization_id = ${orgId} LIMIT 1`,
);

const inviteVars = {
  clientName: client.name ?? "there",
  companyName: client.company ?? client.name ?? "Your company",
  industry: client.industry ?? "Business",
  projectCount: stats?.project_count ?? 0,
  contractValue: formatInviteContractValue(client.contract_value_cents ?? stats?.contract_total_cents ?? 0),
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

if (!emailSent) {
  console.error("Invite email failed to send via Resend/SMTP");
  console.error("Invite link (share manually if needed):", link);
  process.exit(1);
}

console.log(`Portal invite sent to ${inviteEmail} (${client.name})`);
console.log(`Invite link: ${link}`);
