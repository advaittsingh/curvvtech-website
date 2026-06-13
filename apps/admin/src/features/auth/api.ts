import { apiUrl } from "@/lib/backend-url";
import { authFetch } from "@/lib/api";
import {
  clearSession,
  getRefreshToken,
  setSessionTokens,
} from "@/lib/session";
import { toAuthUser } from "@/lib/permissions";
import type { AuthUser, LoginResponse, MeResponse } from "@/types/auth";

async function parseMe(res: Response): Promise<AuthUser | null> {
  if (!res.ok) return null;
  const data = (await res.json()) as MeResponse;
  return toAuthUser(data);
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await authFetch("/api/auth/me");
  return parseMe(res);
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ user: AuthUser; error?: string }> {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = (await res.json().catch(() => ({}))) as LoginResponse & { error?: string };
  if (!res.ok) {
    return {
      user: toAuthUser({
        id: "",
        email: null,
        access_allowed: false,
        waitlist_position: null,
        curvvtech_role: null,
      }),
      error: typeof data.error === "string" ? data.error : "Sign in failed",
    };
  }
  if (!data.access_token || !data.refresh_token || !data.user) {
    return {
      user: toAuthUser({
        id: "",
        email: null,
        access_allowed: false,
        waitlist_position: null,
        curvvtech_role: null,
      }),
      error: "Invalid response from server",
    };
  }
  setSessionTokens(data.access_token, data.refresh_token);
  return { user: toAuthUser(data.user) };
}

export async function refreshSession(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  const res = await fetch(apiUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!data.access_token || !data.refresh_token) return false;
  setSessionTokens(data.access_token, data.refresh_token);
  return true;
}

export async function logoutSession(): Promise<void> {
  try {
    await authFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Best-effort; always clear local session.
  } finally {
    clearSession();
  }
}
