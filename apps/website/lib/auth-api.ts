const TOKEN_KEY = "curvvtech_access_token";
const REFRESH_KEY = "curvvtech_refresh_token";

/** API origin only (no `/api` or `/api/v1` suffix). Callers append `/api/...`. */
export function getApiUrl(): string {
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

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredTokens(access: string, refresh?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearStoredTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export type AuthUser = {
  id: string;
  email?: string | null;
  access_allowed?: boolean;
};

export async function fetchSession(): Promise<AuthUser | null> {
  const base = getApiUrl();
  const token = getStoredToken();
  if (!base || !token) return null;
  const res = await fetch(`${base}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data ?? null;
}

export async function signInApi(
  email: string,
  password: string
): Promise<{ error?: string; access_token?: string; refresh_token?: string; user?: AuthUser }> {
  const base = getApiUrl();
  if (!base) return { error: "NEXT_PUBLIC_API_URL not configured." };
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Sign in failed." };
  return data;
}

export async function signUpApi(
  email: string,
  password: string,
  _name?: string
): Promise<{ error?: string; access_token?: string; refresh_token?: string }> {
  const base = getApiUrl();
  if (!base) return { error: "NEXT_PUBLIC_API_URL not configured." };
  const res = await fetch(`${base}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Sign up failed." };
  return data;
}

export async function forgotPasswordApi(_email: string): Promise<{ error?: string }> {
  return { error: "Password reset is not enabled for JWT auth yet." };
}

export async function signOutApi(): Promise<void> {
  const base = getApiUrl();
  const token = getStoredToken();
  if (base && token) {
    await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  clearStoredTokens();
}
