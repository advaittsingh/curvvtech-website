/**
 * Admin panel API client – Bearer JWT from unified API (`/api/admin/*` or `/admin/*`).
 * Set VITE_BACKEND_URL to API origin (no trailing slash). See `backend-url.ts` for `/api` stripping.
 *
 * On 401, automatically calls `POST /auth/refresh` once (access tokens are short-lived; refresh is long-lived).
 */
import { apiUrl } from "./backend-url";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  redirectToSignIn,
  setSessionTokens,
} from "./session";

let refreshInFlight: Promise<boolean> | null = null;

function isAuthRefreshExemptPath(path: string): boolean {
  return (
    path.includes("/auth/login") ||
    path.includes("/auth/signup") ||
    path.includes("/auth/refresh")
  );
}

async function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const rt = getRefreshToken();
      if (!rt) return false;
      try {
        const res = await fetch(apiUrl("/api/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as {
          access_token?: string;
          refresh_token?: string;
        };
        if (data.access_token && data.refresh_token) {
          setSessionTokens(data.access_token, data.refresh_token);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function authFetch(
  path: string,
  options: RequestInit = {},
  token: string | null = null,
): Promise<Response> {
  const buildHeaders = (access: string | null) => {
    const headers = new Headers(options.headers);
    if (access) headers.set("Authorization", `Bearer ${access}`);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return headers;
  };

  const doFetch = (access: string | null) =>
    fetch(apiUrl(path), { ...options, headers: buildHeaders(access) });

  const firstAccess = token ?? getAccessToken();
  let res = await doFetch(firstAccess);

  if (
    res.status === 401 &&
    !isAuthRefreshExemptPath(path) &&
    getRefreshToken()
  ) {
    const ok = await refreshTokens();
    if (ok) {
      res = await doFetch(getAccessToken());
    } else {
      clearSession();
      redirectToSignIn();
    }
  }

  return res;
}

export function adminApi(token: string | null) {
  return {
    blogs: {
      list: () => authFetch("/api/admin/blogs", {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/blogs", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      categories: () => authFetch("/api/admin/blogs/categories", {}, token).then((r) => r.json()),
      tags: () => authFetch("/api/admin/blogs/tags", {}, token).then((r) => r.json()),
    },
    leads: {
      list: (status?: string) =>
        authFetch(status ? `/api/admin/leads?status=${status}` : "/api/admin/leads", {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/leads", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/leads/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      notes: (id: string) => authFetch(`/api/admin/leads/${id}/notes`, {}, token).then((r) => r.json()),
      addNote: (id: string, body: { body: string; is_internal?: boolean }) =>
        authFetch(`/api/admin/leads/${id}/notes`, { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
    },
    aiCalls: {
      stats: () => authFetch("/api/admin/ai-calls/stats", {}, token).then((r) => r.json()),
      campaignStatus: () => authFetch("/api/admin/ai-calls/campaign-status", {}, token).then((r) => r.json()),
      logs: (params?: {
        limit?: number;
        offset?: number;
        status?: string;
        outcome?: string;
        sinceMinutes?: number;
        onlyHot?: boolean;
      }) => {
        const limit = params?.limit ?? 50;
        const offset = params?.offset ?? 0;
        const q = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        });
        if (params?.status) q.set("status", params.status);
        if (params?.outcome) q.set("outcome", params.outcome);
        if (params?.sinceMinutes) q.set("since_minutes", String(params.sinceMinutes));
        if (params?.onlyHot) q.set("only_hot", "1");
        return authFetch(`/api/admin/ai-calls/logs?${q.toString()}`, {}, token).then((r) => r.json());
      },
      live: () =>
        authFetch("/api/admin/ai-calls/live", {}, token).then((r) => r.json()),
      hot: () =>
        authFetch(
          "/api/admin/ai-calls/logs?limit=20&offset=0&since_minutes=10080&only_hot=1",
          {},
          token,
        ).then((r) => r.json()),
      insights: () => authFetch("/api/admin/ai-calls/insights", {}, token).then((r) => r.json()),
      callbacks: () => authFetch("/api/admin/ai-calls/callbacks?limit=50", {}, token).then((r) => r.json()),
      start: (body?: { limit?: number }) =>
        authFetch("/api/admin/ai-calls/start", { method: "POST", body: JSON.stringify(body ?? {}) }, token).then((r) =>
          r.json(),
        ),
      callLead: (id: string) =>
        authFetch(`/api/admin/ai-calls/lead/${id}/call`, { method: "POST" }, token).then((r) => r.json()),
      markBooked: (id: string) =>
        authFetch(`/api/admin/ai-calls/lead/${id}/booked`, { method: "POST" }, token).then((r) => r.json()),
      markDnd: (id: string) =>
        authFetch(`/api/admin/ai-calls/lead/${id}/dnd`, { method: "POST" }, token).then((r) => r.json()),
      markHot: (id: string) =>
        authFetch(`/api/admin/ai-calls/lead/${id}/hot`, { method: "POST" }, token).then((r) => r.json()),
    },
    clients: {
      list: () => authFetch("/api/admin/clients", {}, token).then((r) => r.json()),
      get: (id: string) => authFetch(`/api/admin/clients/${id}`, {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/clients", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/clients/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      projects: (id: string) => authFetch(`/api/admin/clients/${id}/projects`, {}, token).then((r) => r.json()),
    },
    projects: {
      list: (clientId?: string) =>
        authFetch(clientId ? `/api/admin/projects?client_id=${clientId}` : "/api/admin/projects", {}, token).then((r) =>
          r.json(),
        ),
      get: (id: string) => authFetch(`/api/admin/projects/${id}`, {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/projects", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      milestones: (id: string) => authFetch(`/api/admin/projects/${id}/milestones`, {}, token).then((r) => r.json()),
      addMilestone: (id: string, body: { title: string; due_at?: string }) =>
        authFetch(`/api/admin/projects/${id}/milestones`, { method: "POST", body: JSON.stringify(body) }, token).then(
          (r) => r.json(),
        ),
      updates: (id: string) => authFetch(`/api/admin/projects/${id}/updates`, {}, token).then((r) => r.json()),
      addUpdate: (id: string, body: { body: string; visibility?: string }) =>
        authFetch(`/api/admin/projects/${id}/updates`, { method: "POST", body: JSON.stringify(body) }, token).then(
          (r) => r.json(),
        ),
    },
    invoices: {
      list: (status?: string) =>
        authFetch(status ? `/api/admin/invoices?status=${status}` : "/api/admin/invoices", {}, token).then((r) => r.json()),
      get: (id: string) => authFetch(`/api/admin/invoices/${id}`, {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/invoices", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/invoices/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      items: (id: string) => authFetch(`/api/admin/invoices/${id}/items`, {}, token).then((r) => r.json()),
      addItem: (id: string, body: { description: string; quantity?: number; unit_price_cents: number }) =>
        authFetch(`/api/admin/invoices/${id}/items`, { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          r.json(),
        ),
    },
    team: {
      members: () => authFetch("/api/admin/team/members", {}, token).then((r) => r.json()),
      roles: () => authFetch("/api/admin/team/roles", {}, token).then((r) => r.json()),
      setMemberRole: (userId: string, curvvtech_role: string | null) =>
        authFetch(`/api/admin/team/members/${userId}`, { method: "PATCH", body: JSON.stringify({ curvvtech_role }) }, token).then(
          (r) => r.json(),
        ),
      activity: (limit?: number) =>
        authFetch(limit ? `/api/admin/team/activity?limit=${limit}` : "/api/admin/team/activity", {}, token).then((r) =>
          r.json(),
        ),
    },
    analytics: {
      revenue: () => authFetch("/api/admin/analytics/revenue", {}, token).then((r) => r.json()),
    },
    demoRequests: {
      list: () => authFetch("/api/admin/demo-requests", {}, token).then((r) => r.json()),
      updateStatus: async (id: string, status: string) => {
        const res = await authFetch(
          `/api/admin/demo-requests/${id}`,
          { method: "PATCH", body: JSON.stringify({ status }) },
          token,
        );
        const data = (await res.json()) as { error?: string } & Record<string, unknown>;
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
        }
        return data;
      },
    },
    chats: {
      list: (status?: string) =>
        authFetch(status ? `/api/admin/chats?status=${status}` : "/api/admin/chats", {}, token).then((r) => r.json()),
      analytics: () => authFetch("/api/admin/chats/analytics", {}, token).then((r) => r.json()),
      get: (id: string) => authFetch(`/api/admin/chats/${id}`, {}, token).then((r) => r.json()),
      update: (id: string, body: { status?: string; agent_takeover?: boolean }) =>
        authFetch(`/api/admin/chats/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      sendMessage: (id: string, message: string) =>
        authFetch(`/api/admin/chats/${id}/messages`, { method: "POST", body: JSON.stringify({ message }) }, token).then(
          (r) => r.json(),
        ),
      sendTranscriptWhatsApp: (id: string, phone: string) =>
        authFetch(`/api/admin/chats/${id}/send-transcript-whatsapp`, { method: "POST", body: JSON.stringify({ phone }) }, token).then(
          (r) => r.json(),
        ),
    },
  };
}
