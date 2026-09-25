import { Router } from "express";
import { config } from "../../config.js";
import { sql, firstRow } from "../../lib/sqlPool.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { badRequest, unauthorized } from "../../lib/errors.js";
import { normalizeClientRole } from "../../lib/clientPermissions.js";
import {
  signClientAccessToken,
  createClientRefreshPlain,
  hashClientRefreshToken,
  verifyClientRefreshPlain,
  hashClientPassword,
  verifyClientPassword,
  randomToken,
} from "./clientTokens.js";
import { sendClientEmail } from "../shared/communications/emailService.js";
import { emitActivityEvent } from "../shared/activity/emitActivityEvent.js";

const router = Router();

type ClientUserRow = {
  id: string;
  organization_id: string;
  client_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  password_hash: string | null;
};

function issueTokens(u: { id: string; email: string; org: string; client: string; role: string }) {
  const role = normalizeClientRole(u.role);
  const access = signClientAccessToken(
    { sub: u.id, email: u.email, org_id: u.org, client_id: u.client, role },
    config.clientJwtSecret,
    config.clientJwtAccessExpiresSec,
  );
  const refreshPlain = createClientRefreshPlain(u.id);
  return { access, refreshPlain, role };
}

async function persistSession(clientUserId: string, refreshPlain: string, ua?: string, ip?: string) {
  const hash = await hashClientRefreshToken(refreshPlain);
  const expires = new Date(Date.now() + config.clientJwtRefreshExpiresSec * 1000).toISOString();
  await sql`
    INSERT INTO client_sessions (client_user_id, refresh_token_hash, user_agent, ip_address, expires_at)
    VALUES (${clientUserId}, ${hash}, ${ua ?? null}, ${ip ?? null}, ${expires})
  `;
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) throw badRequest("Email and password required");

    const user = firstRow<ClientUserRow>(
      await sql`SELECT * FROM client_users WHERE lower(email) = ${email.trim().toLowerCase()} LIMIT 1`,
    );
    if (!user || user.status !== "active") throw unauthorized("Invalid credentials");
    const ok = await verifyClientPassword(password, user.password_hash);
    if (!ok) throw unauthorized("Invalid credentials");

    const { access, refreshPlain, role } = issueTokens({
      id: user.id,
      email: user.email,
      org: user.organization_id,
      client: user.client_id,
      role: user.role,
    });
    await persistSession(user.id, refreshPlain, req.headers["user-agent"], req.ip);
    await sql`UPDATE client_users SET last_login_at = now() WHERE id = ${user.id}`;
    await sql`UPDATE clients SET portal_last_login_at = now() WHERE id = ${user.client_id}`;

    res.json({
      access_token: access,
      refresh_token: refreshPlain,
      user: { id: user.id, email: user.email, name: user.name, role },
    });
  }),
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refresh_token } = req.body as { refresh_token?: string };
    if (!refresh_token || !refresh_token.includes(".")) throw unauthorized("Invalid refresh token");
    const clientUserId = refresh_token.split(".")[0];

    const sessions = (await sql`
      SELECT id, refresh_token_hash FROM client_sessions
      WHERE client_user_id = ${clientUserId} AND revoked_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC LIMIT 10
    `) as { id: string; refresh_token_hash: string }[];

    let matched: string | null = null;
    for (const s of sessions) {
      if (await verifyClientRefreshPlain(refresh_token, s.refresh_token_hash)) {
        matched = s.id;
        break;
      }
    }
    if (!matched) throw unauthorized("Invalid refresh token");

    const user = firstRow<ClientUserRow>(
      await sql`SELECT * FROM client_users WHERE id = ${clientUserId} LIMIT 1`,
    );
    if (!user || user.status !== "active") throw unauthorized("Account inactive");

    // Rotate: revoke old, issue new.
    await sql`UPDATE client_sessions SET revoked_at = now() WHERE id = ${matched}`;
    const { access, refreshPlain, role } = issueTokens({
      id: user.id,
      email: user.email,
      org: user.organization_id,
      client: user.client_id,
      role: user.role,
    });
    await persistSession(user.id, refreshPlain, req.headers["user-agent"], req.ip);

    res.json({
      access_token: access,
      refresh_token: refreshPlain,
      user: { id: user.id, email: user.email, name: user.name, role },
    });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const { refresh_token } = req.body as { refresh_token?: string };
    if (refresh_token?.includes(".")) {
      const clientUserId = refresh_token.split(".")[0];
      await sql`UPDATE client_sessions SET revoked_at = now() WHERE client_user_id = ${clientUserId} AND revoked_at IS NULL`;
    }
    res.json({ ok: true });
  }),
);

router.post(
  "/accept-invite",
  asyncHandler(async (req, res) => {
    const { token, password, name } = req.body as { token?: string; password?: string; name?: string };
    if (!token || !password || password.length < 8)
      throw badRequest("Token and password (min 8 chars) required");

    const user = firstRow<ClientUserRow & { invite_expires_at: string | null }>(
      await sql`
        SELECT * FROM client_users
        WHERE invite_token = ${token} AND status = 'invited'
        LIMIT 1
      `,
    );
    if (!user) throw badRequest("Invalid or used invite");
    if (user.invite_expires_at && new Date(user.invite_expires_at) < new Date())
      throw badRequest("Invite expired");

    const hash = await hashClientPassword(password);
    await sql`
      UPDATE client_users
      SET password_hash = ${hash}, status = 'active', invite_token = NULL,
          name = COALESCE(NULLIF(${name ?? ""}, ''), name), updated_at = now()
      WHERE id = ${user.id}
    `;
    await sql`UPDATE clients SET portal_status = 'active', portal_last_login_at = now() WHERE id = ${user.client_id}`;

    await emitActivityEvent({
      organizationId: user.organization_id,
      clientId: user.client_id,
      actorType: "client",
      actorId: user.id,
      actorName: name ?? user.email,
      eventType: "client.logged_in",
      entityType: "client",
      entityId: user.client_id,
      title: "Client activated portal account",
      visibility: "internal",
    });

    const { access, refreshPlain, role } = issueTokens({
      id: user.id,
      email: user.email,
      org: user.organization_id,
      client: user.client_id,
      role: user.role,
    });
    await persistSession(user.id, refreshPlain, req.headers["user-agent"], req.ip);

    res.json({
      access_token: access,
      refresh_token: refreshPlain,
      user: { id: user.id, email: user.email, name: name ?? user.name, role },
    });
  }),
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) throw badRequest("Email required");
    const user = firstRow<ClientUserRow>(
      await sql`SELECT * FROM client_users WHERE lower(email) = ${email.trim().toLowerCase()} AND status = 'active' LIMIT 1`,
    );
    // Always return ok (no user enumeration).
    if (user) {
      const token = randomToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await sql`
        INSERT INTO client_password_resets (client_user_id, token, expires_at)
        VALUES (${user.id}, ${token}, ${expires})
      `;
      const link = `${config.clientPortalUrl}/reset-password?token=${token}`;
      await sendClientEmail({
        organizationId: user.organization_id,
        to: user.email,
        subject: "Reset your portal password",
        html: `<p>Hi ${user.name || "there"},</p><p>Reset your password using the link below (valid 1 hour):</p><p><a href="${link}">${link}</a></p>`,
      });
    }
    res.json({ ok: true });
  }),
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password || password.length < 8)
      throw badRequest("Token and password (min 8 chars) required");
    const row = firstRow<{ id: string; client_user_id: string; expires_at: string; used_at: string | null }>(
      await sql`SELECT * FROM client_password_resets WHERE token = ${token} LIMIT 1`,
    );
    if (!row || row.used_at || new Date(row.expires_at) < new Date())
      throw badRequest("Invalid or expired token");
    const hash = await hashClientPassword(password);
    await sql`UPDATE client_users SET password_hash = ${hash}, updated_at = now() WHERE id = ${row.client_user_id}`;
    await sql`UPDATE client_password_resets SET used_at = now() WHERE id = ${row.id}`;
    await sql`UPDATE client_sessions SET revoked_at = now() WHERE client_user_id = ${row.client_user_id} AND revoked_at IS NULL`;
    res.json({ ok: true });
  }),
);

export default router;
