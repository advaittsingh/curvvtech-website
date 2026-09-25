import crypto from "node:crypto";
import type pg from "pg";
import { config } from "../../config.js";
import { escapeHtml } from "../../lib/escapeHtml.js";
import { isInvitableAdminRole, type AdminRole } from "../../lib/adminPermissions.js";
import { sendEmail } from "../shared/communications/mailer.js";
import { hashPassword } from "./auth.tokens.js";
import { issueSession, type AuthTokens } from "./auth.service.js";

export class StaffInviteError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export type StaffInvitation = {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function hashStaffInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createStaffInvitation(
  pool: pg.Pool,
  input: { email: string; name?: string; role: unknown; invitedBy: string; expiresInHours?: number },
): Promise<StaffInvitation & { invite_url: string; token: string; email_sent: boolean }> {
  const email = normalizedEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new StaffInviteError(400, "Valid email is required");
  }
  if (!isInvitableAdminRole(input.role)) {
    throw new StaffInviteError(400, "Invalid staff role");
  }
  const requestedExpiry = input.expiresInHours ?? 72;
  if (!Number.isFinite(requestedExpiry)) {
    throw new StaffInviteError(400, "expires_in_hours must be a number");
  }
  const expiresInHours = Math.min(Math.max(requestedExpiry, 1), 24 * 14);
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashStaffInviteToken(token);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await pool.query(
    `UPDATE staff_invitations
     SET revoked_at = now(), updated_at = now()
     WHERE lower(email) = $1 AND accepted_at IS NULL AND revoked_at IS NULL`,
    [email],
  );
  const result = await pool.query<StaffInvitation>(
    `INSERT INTO staff_invitations (token_hash, email, name, role, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5::uuid, $6)
     RETURNING id::text, email, name, role, invited_by::text, expires_at::text,
       accepted_at::text, revoked_at::text, created_at::text`,
    [tokenHash, email, input.name?.trim() || null, input.role, input.invitedBy, expiresAt],
  );
  const invitation = result.rows[0]!;
  const inviteUrl = `${config.staffInviteBaseUrl.replace(/\/$/, "")}/#/auth/staff-invite/${encodeURIComponent(token)}`;
  const mail = await sendEmail({
    to: email,
    subject: "You’re invited to the Curvvtech workspace",
    html: `<p>You have been invited to the Curvvtech workspace as <strong>${escapeHtml(input.role)}</strong>.</p>
      <p><a href="${escapeHtml(inviteUrl)}">Accept invitation</a></p>
      <p>This invitation expires in ${expiresInHours} hours.</p>`,
    text: `You have been invited to the Curvvtech workspace as ${input.role}. Accept: ${inviteUrl}`,
  });

  return { ...invitation, invite_url: inviteUrl, token, email_sent: mail.ok };
}

export async function validateStaffInvitation(
  pool: pg.Pool,
  token: string,
): Promise<Pick<StaffInvitation, "email" | "name" | "role" | "expires_at">> {
  if (token.length < 20) throw new StaffInviteError(404, "Invitation not found");
  const result = await pool.query<StaffInvitation>(
    `SELECT email, name, role, expires_at::text
     FROM staff_invitations
     WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL
       AND expires_at > now()
     LIMIT 1`,
    [hashStaffInviteToken(token)],
  );
  const invitation = result.rows[0];
  if (!invitation) throw new StaffInviteError(404, "Invitation is invalid or expired");
  return invitation;
}

export async function acceptStaffInvitation(
  pool: pg.Pool,
  input: { token: string; password: string; displayName?: string },
): Promise<{ user: { id: string; email: string; curvvtech_role: AdminRole }; tokens: AuthTokens }> {
  if (input.password.length < 8) {
    throw new StaffInviteError(400, "Password must be at least 8 characters");
  }
  const passwordHash = await hashPassword(input.password);
  const client = await pool.connect();
  let user: { id: string; email: string; curvvtech_role: AdminRole } | null = null;
  try {
    await client.query("BEGIN");
    const inviteResult = await client.query<StaffInvitation>(
      `SELECT id::text, email, name, role, expires_at::text, accepted_at::text, revoked_at::text
       FROM staff_invitations WHERE token_hash = $1 FOR UPDATE`,
      [hashStaffInviteToken(input.token)],
    );
    const invite = inviteResult.rows[0];
    if (
      !invite ||
      invite.accepted_at ||
      invite.revoked_at ||
      new Date(invite.expires_at).getTime() <= Date.now() ||
      !isInvitableAdminRole(invite.role)
    ) {
      throw new StaffInviteError(410, "Invitation is invalid, expired, or already used");
    }

    const email = normalizedEmail(invite.email);
    const existing = await client.query<{ id: string }>(
      `SELECT id::text FROM users WHERE lower(trim(email)) = $1 LIMIT 1 FOR UPDATE`,
      [email],
    );
    let userId = existing.rows[0]?.id;
    if (userId) {
      await client.query(
        `UPDATE users SET password_hash = $2, curvvtech_role = $3,
           access_allowed = true, waitlist_position = NULL, updated_at = now()
         WHERE id = $1::uuid`,
        [userId, passwordHash, invite.role],
      );
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users (
           auth_sub, email, password_hash, curvvtech_role, access_allowed, waitlist_position
         ) VALUES ($1, $2, $3, $4, true, NULL)
         RETURNING id::text`,
        [`pw:${crypto.randomUUID()}`, email, passwordHash, invite.role],
      );
      userId = inserted.rows[0]!.id;
    }

    const displayName = input.displayName?.trim() || invite.name?.trim() || email.split("@")[0] || "Team member";
    await client.query(
      `INSERT INTO user_profiles (user_id, display_name, email)
       VALUES ($1::uuid, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = CASE
           WHEN user_profiles.display_name = '' THEN EXCLUDED.display_name
           ELSE user_profiles.display_name
         END,
         email = EXCLUDED.email,
         updated_at = now()`,
      [userId, displayName, email],
    );
    await client.query(
      `UPDATE staff_invitations SET accepted_at = now(), updated_at = now()
       WHERE id = $1::uuid`,
      [invite.id],
    );
    await client.query("COMMIT");
    user = { id: userId, email, curvvtech_role: invite.role };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const tokens = await issueSession(pool, user.id, user.email);
  return { user, tokens };
}

export async function listStaffInvitations(pool: pg.Pool): Promise<StaffInvitation[]> {
  const result = await pool.query<StaffInvitation>(
    `SELECT id::text, email, name, role, invited_by::text, expires_at::text,
       accepted_at::text, revoked_at::text, created_at::text
     FROM staff_invitations
     WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 200`,
  );
  return result.rows;
}

export async function revokeStaffInvitation(pool: pg.Pool, id: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE staff_invitations SET revoked_at = now(), updated_at = now()
     WHERE id = $1::uuid AND accepted_at IS NULL AND revoked_at IS NULL`,
    [id],
  );
  return Boolean(result.rowCount);
}
