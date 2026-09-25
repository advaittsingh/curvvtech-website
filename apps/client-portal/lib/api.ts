const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type PortalUser = { id: string; email: string; name: string; role: string };
export type Session = { accessToken: string; refreshToken: string; user: PortalUser };

const KEY = "curvv_portal_session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

async function refreshTokens(): Promise<Session | null> {
  const s = getSession();
  if (!s?.refreshToken) return null;
  try {
    const res = await fetch(`${API}/api/client/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const next: Session = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: data.user,
    };
    setSession(next);
    return next;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  const res = await fetch(`${API}/api/client${path}`, { ...options, headers });
  if (res.status === 401 && retry && session?.refreshToken) {
    const next = await refreshTokens();
    if (next) return api<T>(path, options, false);
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? data.error ?? "Request failed");
  return data as T;
}

export async function login(email: string, password: string): Promise<Session> {
  const res = await fetch(`${API}/api/client/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? data.error ?? "Login failed");
  const session: Session = { accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user };
  setSession(session);
  return session;
}

export async function acceptInvite(token: string, password: string, name: string): Promise<Session> {
  const res = await fetch(`${API}/api/client/auth/accept-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? data.error ?? "Could not accept invite");
  const session: Session = { accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user };
  setSession(session);
  return session;
}

export async function logout() {
  const s = getSession();
  if (s?.refreshToken) {
    await fetch(`${API}/api/client/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refreshToken }),
    }).catch(() => {});
  }
  clearSession();
}

export type Branding = {
  organization_id: string;
  slug: string;
  branding: {
    logo_url?: string;
    brand_color?: string;
    accent_color?: string;
    company_name?: string;
  };
};

export async function fetchBranding(): Promise<Branding> {
  const res = await fetch(`${API}/api/client/branding`, {
    headers: typeof window !== "undefined" ? { "X-Portal-Host": window.location.host } : {},
  });
  return res.json();
}

/**
 * Fetch an authenticated HTML document (invoice/receipt) and open it in a new
 * tab for viewing / printing / saving as PDF. Uses the Bearer token because a
 * plain link would not carry the Authorization header.
 */
export async function openDoc(path: string, autoPrint = true): Promise<void> {
  const session = getSession();
  const res = await fetch(`${API}/api/client${path}`, {
    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
  });
  if (!res.ok) throw new Error("Document not available");
  const html = await res.text();
  const w = window.open("", "_blank");
  if (!w) throw new Error("Please allow pop-ups to view the document");
  w.document.open();
  w.document.write(html);
  w.document.close();
  if (autoPrint) {
    w.onload = () => {
      w.focus();
      w.print();
    };
  }
}

export type UploadFolder = { id: string; name: string; kind: string; file_count: number };

/**
 * Uploads a file to a project via the client portal:
 *   1. ask the API for a presigned S3 URL (creates the file row in the chosen folder)
 *   2. PUT the bytes straight to S3
 *   3. confirm so the team sees it in the admin folder + project journal
 * The optional `folderId` targets one of the folders from `/projects/:id/folders`;
 * when omitted the file lands in the project's "Assets" folder.
 */
export async function uploadProjectFile(
  projectId: string,
  file: File,
  folderId?: string,
): Promise<void> {
  const presigned = await api<{ fileId: string; url: string; key: string; expiresIn: number }>(
    "/files/upload-url",
    {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        folder_id: folderId,
      }),
    },
  );

  const put = await fetch(presigned.url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!put.ok) {
    await api(`/files/${presigned.fileId}`, { method: "DELETE" }).catch(() => {});
    throw new Error("Upload to storage failed");
  }

  try {
    await api(`/files/${presigned.fileId}/confirm`, { method: "POST" });
  } catch (err) {
    await api(`/files/${presigned.fileId}`, { method: "DELETE" }).catch(() => {});
    throw err;
  }
}

export const API_BASE = API;
export function money(cents: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    (cents ?? 0) / 100,
  );
}
