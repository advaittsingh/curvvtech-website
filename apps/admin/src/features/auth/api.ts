import { apiUrl } from "@/lib/backend-url";
import { authFetch } from "@/lib/api";
import {
  clearSession,
  getRefreshToken,
  setSessionTokens,
} from "@/lib/session";
import { toAuthUser } from "@/lib/permissions";
import type { AuthUser, LoginResponse, MeResponse } from "@/types/auth";

/** Keep session checks from hanging the whole admin UI when the API is down. */
const AUTH_TIMEOUT_MS = 8_000;

function authSignal(): AbortSignal {
  return AbortSignal.timeout(AUTH_TIMEOUT_MS);
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

function emptyUser(): AuthUser {
  return toAuthUser({
    id: "",
    email: null,
    access_allowed: false,
    waitlist_position: null,
    curvvtech_role: null,
  });
}

export type StaffInviteDetails = {
  email: string;
  name?: string | null;
  role: string;
  expires_at?: string | null;
};

async function parseMe(res: Response): Promise<AuthUser | null> {
  if (!res.ok) return null;
  try {
    const data = (await res.json()) as MeResponse;
    return toAuthUser(data);
  } catch {
    return null;
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await authFetch("/api/auth/me", { signal: authSignal() });
    return parseMe(res);
  } catch (err) {
    if (isAbortError(err)) throw err;
    return null;
  }
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ user: AuthUser; error?: string }> {
  try {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
      signal: authSignal(),
    });
    const data = (await res.json().catch(() => ({}))) as LoginResponse & { error?: string };
    if (!res.ok) {
      return {
        user: emptyUser(),
        error: typeof data.error === "string" ? data.error : "Sign in failed",
      };
    }
    if (!data.access_token || !data.refresh_token || !data.user) {
      return {
        user: emptyUser(),
        error: "Invalid response from server",
      };
    }
    setSessionTokens(data.access_token, data.refresh_token);
    return { user: toAuthUser(data.user) };
  } catch (err) {
    return {
      user: emptyUser(),
      error: isAbortError(err)
        ? "Cannot reach the API. Try again in a moment."
        : "Network error",
    };
  }
}

export async function refreshSession(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
      signal: authSignal(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) return false;
    setSessionTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await authFetch("/api/auth/logout", { method: "POST", signal: authSignal() });
  } catch {
    // Best-effort; always clear local session.
  } finally {
    clearSession();
  }
}

export async function validateStaffInvite(token: string): Promise<StaffInviteDetails> {
  const res = await fetch(apiUrl(`/api/auth/staff-invites/${encodeURIComponent(token)}`));
  const data = (await res.json().catch(() => ({}))) as StaffInviteDetails & {
    invitation?: StaffInviteDetails;
    error?: string;
    message?: string;
  };
  if (!res.ok) throw new Error(data.error ?? data.message ?? "This invitation is invalid or has expired.");
  return data.invitation ?? data;
}

export async function acceptStaffInvite(
  token: string,
  body: { name: string; password: string },
): Promise<{ hasSession: boolean }> {
  const res = await fetch(apiUrl(`/api/auth/staff-invites/${encodeURIComponent(token)}/accept`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<LoginResponse> & {
    error?: string;
    message?: string;
  };
  if (!res.ok) throw new Error(data.error ?? data.message ?? "Could not accept this invitation.");
  if (data.access_token && data.refresh_token) {
    setSessionTokens(data.access_token, data.refresh_token);
    return { hasSession: true };
  }
  return { hasSession: false };
}
