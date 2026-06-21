import { authFetch } from "./api";
import { getAccessToken } from "./session";

export async function adminJson<T>(
  path: string,
  options: RequestInit = {},
  token: string | null = getAccessToken(),
): Promise<T> {
  const res = await authFetch(path, options, token);
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}
