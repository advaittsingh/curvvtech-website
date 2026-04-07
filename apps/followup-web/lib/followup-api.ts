/**
 * API origin only — **no** `/api` or `/api/v1` suffix. Callers append `/api/v1/...` or `/api/auth/...`.
 * Strips common misconfigurations so requests are not sent to `/api/api/v1/...` or `/api/v1/api/v1/...`
 * (both yield 404 after auth on the server).
 */
export function getApiOrigin(): string {
  const u =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "";
  let s = String(u).trim().replace(/\/+$/, "");
  for (let i = 0; i < 4; i++) {
    const before = s;
    if (s.endsWith("/api/v1")) s = s.slice(0, -"/api/v1".length).replace(/\/+$/, "");
    else if (s.endsWith("/api")) s = s.slice(0, -4).replace(/\/+$/, "");
    if (s === before) break;
  }
  return s;
}

const ACCESS = "followup_access_token";
const REFRESH = "followup_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS);
}

export function setTokens(access: string, refresh?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS, access);
  if (refresh) localStorage.setItem(REFRESH, refresh);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

export function landingHeaders(): HeadersInit {
  const key = process.env.NEXT_PUBLIC_LANDING_API_KEY || "";
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (key) h["x-followup-api-key"] = key;
  return h;
}

export function authHeaders(): HeadersInit {
  const t = getAccessToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export function parseApiError(data: Record<string, unknown>): string {
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (data.error === "VALIDATION_ERROR") return "Please check your input.";
  if (data.error === "LAST_PAYMENT_METHOD") {
    return typeof data.message === "string" && data.message.trim()
      ? data.message
      : "Add another payment method before removing the last one.";
  }
  if (typeof data.error === "string") return data.error;
  return "Request failed";
}
