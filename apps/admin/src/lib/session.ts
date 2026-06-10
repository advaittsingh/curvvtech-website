const ACCESS = "curvvtech_admin_access_token";
const REFRESH = "curvvtech_admin_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH);
}

export function setSessionTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

export function isSessionPresent(): boolean {
  return Boolean(getAccessToken());
}

/** Full page navigation so HashRouter + ProtectedRoute pick up cleared storage. */
export function redirectToSignIn(): void {
  if (typeof window === "undefined") return;
  window.location.href =
    window.location.origin + window.location.pathname + "#/auth/sign-in";
}
