import Constants from "expo-constants";

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** `EXPO_PUBLIC_API_URL` is often mistakenly set to `https://api.example.com/v1` — strip so `/v1/me` does not become `/v1/v1/me`. */
function normalizeApiOrigin(s: string): string {
  let x = stripTrailingSlash(s.trim());
  if (x.endsWith("/v1")) {
    x = stripTrailingSlash(x.slice(0, -3));
  }
  return x;
}

type Extra = { apiUrl?: string };

/**
 * API origin only (scheme + host + port). No `/v1` suffix — auth lives at `/auth/*`, product APIs at `/v1/*`.
 * A trailing `/v1` is stripped so misconfigured env still works.
 * - Dev: prefer Babel-inlined `EXPO_PUBLIC_API_URL`.
 * - Release: prefer `extra.apiUrl` from `app.config` (Gradle cwd may omit Metro env).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim() ?? "";
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const fromExtra = typeof extra?.apiUrl === "string" ? extra.apiUrl.trim() : "";

  const chosen = __DEV__ ? fromEnv || fromExtra : fromExtra || fromEnv;
  if (chosen) return normalizeApiOrigin(chosen);

  return "http://localhost:3000";
}
