import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { config } from "../../../config.js";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import { logger } from "../../../logger.js";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";
const CALENDAR_EVENTS = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export const GOOGLE_PROVIDERS = ["gmail", "google_calendar"] as const;
export type GoogleProvider = (typeof GOOGLE_PROVIDERS)[number];

export function googleOauthRedirectUri(): string {
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const api = (process.env.API_PUBLIC_URL?.trim() || "https://api.curvvtech.in").replace(/\/$/, "");
  return `${api}/api/admin/integrations/oauth/callback`;
}

export function googleOAuthConfigured(): boolean {
  return Boolean(config.googleClientId && config.googleClientSecret);
}

function stateSecret(): string {
  return config.jwtAccessSecret || "dev-google-oauth-state";
}

export function signGoogleOauthState(payload: { sub: string; provider: GoogleProvider }): string {
  const body = Buffer.from(
    JSON.stringify({ sub: payload.sub, p: payload.provider, exp: Date.now() + 15 * 60 * 1000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyGoogleOauthState(state: string): { sub: string; provider: GoogleProvider } {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("Invalid OAuth state");
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid OAuth state");
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    sub?: string;
    p?: string;
    exp?: number;
  };
  if (!parsed.sub || (parsed.p !== "gmail" && parsed.p !== "google_calendar")) {
    throw new Error("Invalid OAuth state");
  }
  if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
    throw new Error("OAuth state expired — connect again from Settings");
  }
  return { sub: parsed.sub, provider: parsed.p };
}

function scopesFor(provider: GoogleProvider): string {
  const email = "https://www.googleapis.com/auth/userinfo.email";
  if (provider === "gmail") return `https://www.googleapis.com/auth/gmail.send ${email}`;
  return `https://www.googleapis.com/auth/calendar.events ${email}`;
}

export function buildGoogleOauthUrl(opts: { sub: string; provider: GoogleProvider }): { url: string } | { error: string } {
  if (!config.googleClientId) {
    return { error: "Set GOOGLE_CLIENT_ID on the API to enable Google OAuth" };
  }
  if (!config.googleClientSecret) {
    return { error: "Set GOOGLE_CLIENT_SECRET on the API to complete Google OAuth" };
  }
  const redirectUri = googleOauthRedirectUri();
  const state = signGoogleOauthState(opts);
  const url = new URL(GOOGLE_AUTH);
  url.searchParams.set("client_id", config.googleClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopesFor(opts.provider));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return { url: url.toString() };
}

type TokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

async function exchangeCode(code: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: googleOauthRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TokenSet & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Google token exchange failed");
  }
  return json;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TokenSet & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Google token refresh failed");
  }
  return json;
}

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_USERINFO, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}

function adminIntegrationsRedirect(query: Record<string, string>): string {
  const base = (config.adminPanelUrl || "https://admin.curvvtech.com").replace(/\/$/, "");
  const qs = new URLSearchParams(query).toString();
  return `${base}/#/settings/integrations${qs ? `?${qs}` : ""}`;
}

export async function googleOauthCallbackHandler(req: Request, res: Response): Promise<void> {
  const errorParam = typeof req.query.error === "string" ? req.query.error : "";
  if (errorParam) {
    res.redirect(adminIntegrationsRedirect({ error: errorParam }));
    return;
  }
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!code || !state) {
    res.redirect(adminIntegrationsRedirect({ error: "missing_code" }));
    return;
  }
  try {
    const { sub, provider } = verifyGoogleOauthState(state);
    const tokens = await exchangeCode(code);
    const email = await fetchGoogleEmail(tokens.access_token);
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;
    const metadata = JSON.stringify({ email, scope: tokens.scope ?? "" });
    await sql`
      INSERT INTO integration_connections (
        provider, user_id, access_token, refresh_token, token_expires_at, metadata, enabled
      )
      VALUES (
        ${provider}, ${sub}, ${tokens.access_token}, ${tokens.refresh_token ?? null},
        ${expiresAt}::timestamptz, ${metadata}::jsonb, true
      )
      ON CONFLICT (provider, user_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, integration_connections.refresh_token),
        token_expires_at = EXCLUDED.token_expires_at,
        metadata = EXCLUDED.metadata,
        enabled = true,
        "updatedAt" = NOW()
    `;
    res.redirect(adminIntegrationsRedirect({ connected: provider }));
  } catch (e) {
    logger.warn({ err: e }, "google_oauth_callback_failed");
    res.redirect(adminIntegrationsRedirect({ error: "oauth_failed" }));
  }
}

type CalendarRow = {
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

async function loadCalendarConnection(userId: string): Promise<CalendarRow | null> {
  return firstRow<CalendarRow>(
    await sql`
      SELECT access_token, refresh_token, token_expires_at::text AS token_expires_at
      FROM integration_connections
      WHERE user_id = ${userId} AND provider = 'google_calendar' AND enabled = true
      LIMIT 1
    `,
  );
}

export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  const row = await loadCalendarConnection(userId);
  return Boolean(row?.access_token || row?.refresh_token);
}

async function persistTokens(
  userId: string,
  tokens: TokenSet,
  previousRefresh: string | null,
): Promise<void> {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;
  const refresh = tokens.refresh_token ?? previousRefresh;
  await sql`
    UPDATE integration_connections
    SET
      access_token = ${tokens.access_token},
      refresh_token = ${refresh},
      token_expires_at = ${expiresAt}::timestamptz,
      "updatedAt" = NOW()
    WHERE user_id = ${userId} AND provider = 'google_calendar'
  `;
}

async function accessTokenFor(userId: string): Promise<string | null> {
  const row = await loadCalendarConnection(userId);
  if (!row) return null;
  const exp = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  const stale = !row.access_token || (exp > 0 && exp < Date.now() + 60_000);
  if (!stale && row.access_token) return row.access_token;
  if (!row.refresh_token || !config.googleClientSecret) return row.access_token;
  try {
    const tokens = await refreshAccessToken(row.refresh_token);
    await persistTokens(userId, tokens, row.refresh_token);
    return tokens.access_token;
  } catch (err) {
    logger.warn({ err }, "google_calendar_refresh_failed");
    return row.access_token;
  }
}

export type MeetEventInput = {
  userId: string;
  title: string;
  description: string;
  start: Date;
  durationMin: number;
  attendeeEmail: string;
  attendeeName: string;
};

export type MeetEventResult =
  | { ok: true; meetUrl: string; eventId: string }
  | { ok: false; error: string };

function meetUrlFromEvent(json: {
  hangoutLink?: string;
  htmlLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
}): string | null {
  if (json.hangoutLink) return json.hangoutLink;
  const meet = json.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video" && p.uri);
  return meet?.uri ?? null;
}

export async function createGoogleMeetEvent(input: MeetEventInput): Promise<MeetEventResult> {
  if (!googleOAuthConfigured()) {
    return { ok: false, error: "Google OAuth is not configured on the API" };
  }
  let token = await accessTokenFor(input.userId);
  if (!token) {
    return { ok: false, error: "Google Calendar is not connected" };
  }

  const end = new Date(input.start.getTime() + input.durationMin * 60_000);
  const payload = {
    summary: input.title,
    description: input.description,
    start: { dateTime: input.start.toISOString(), timeZone: "Asia/Kolkata" },
    end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
    attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName }],
    conferenceData: {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  async function insert(accessToken: string) {
    return fetch(`${CALENDAR_EVENTS}?conferenceDataVersion=1&sendUpdates=none`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  let res = await insert(token);
  if (res.status === 401) {
    const row = await loadCalendarConnection(input.userId);
    if (row?.refresh_token) {
      try {
        const tokens = await refreshAccessToken(row.refresh_token);
        await persistTokens(input.userId, tokens, row.refresh_token);
        token = tokens.access_token;
        res = await insert(token);
      } catch (err) {
        logger.warn({ err }, "google_calendar_retry_refresh_failed");
      }
    }
  }

  const json = (await res.json()) as {
    id?: string;
    hangoutLink?: string;
    htmlLink?: string;
    conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
    error?: { message?: string };
  };

  if (!res.ok) {
    const message = json.error?.message || `Google Calendar error (${res.status})`;
    logger.warn({ status: res.status, message }, "google_meet_create_failed");
    return { ok: false, error: message };
  }

  const meetUrl = meetUrlFromEvent(json);
  if (!meetUrl || !json.id) {
    return { ok: false, error: "Calendar event was created but Google did not return a Meet link" };
  }
  return { ok: true, meetUrl, eventId: json.id };
}
