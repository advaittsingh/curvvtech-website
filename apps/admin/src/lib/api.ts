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
          signal: AbortSignal.timeout(8_000),
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
    if (!headers.has("Content-Type")) {
      const body = options.body;
      const skipJson =
        body == null ||
        (typeof FormData !== "undefined" && body instanceof FormData) ||
        (typeof Blob !== "undefined" && body instanceof Blob);
      if (!skipJson) headers.set("Content-Type", "application/json");
    }
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

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    const msg =
      typeof data.message === "string" && data.message.trim()
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export function adminApi(token: string | null) {
  return {
    blogs: {
      list: () => authFetch("/api/admin/blogs", {}, token).then((r) => r.json()),
      get: (id: string) => authFetch(`/api/admin/blogs/${id}`, {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/blogs", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/blogs/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      remove: (id: string) =>
        authFetch(`/api/admin/blogs/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
      categories: () => authFetch("/api/admin/blogs/categories", {}, token).then((r) => r.json()),
      tags: () => authFetch("/api/admin/blogs/tags", {}, token).then((r) => r.json()),
    },
    leads: {
      list: async (filters?: import("@/features/leads/schemas").LeadFilters) => {
        const q = new URLSearchParams();
        if (filters?.status) q.set("status", filters.status);
        if (filters?.assigned_to) q.set("assigned_to", filters.assigned_to);
        if (filters?.priority) q.set("priority", filters.priority);
        if (filters?.source) q.set("source", filters.source);
        if (filters?.project_type) q.set("project_type", filters.project_type);
        if (filters?.budget_min !== undefined) q.set("budget_min", String(filters.budget_min));
        if (filters?.budget_max !== undefined) q.set("budget_max", String(filters.budget_max));
        const qs = q.toString();
        const r = await authFetch(qs ? `/api/admin/leads?${qs}` : "/api/admin/leads", {}, token);
        const data = await r.json();
        if (!r.ok) {
          throw new Error(String((data as { error?: string; message?: string }).error ?? (data as { message?: string }).message ?? "Failed to load leads"));
        }
        return data;
      },
      pipelineSummary: async () => {
        const r = await authFetch("/api/admin/leads/pipeline-summary", {}, token);
        const data = await r.json();
        if (!r.ok) return data;
        return data;
      },
      get: (id: string) => authFetch(`/api/admin/leads/${id}`, {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/leads", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/leads/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      notes: (id: string) => authFetch(`/api/admin/leads/${id}/notes`, {}, token).then((r) => r.json()),
      addNote: (id: string, body: { body: string; is_internal?: boolean }) =>
        authFetch(`/api/admin/leads/${id}/notes`, { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      timeline: (id: string) => authFetch(`/api/admin/leads/${id}/timeline`, {}, token).then((r) => r.json()),
      activity: (id: string) => authFetch(`/api/admin/leads/${id}/activity`, {}, token).then((r) => r.json()),
      aiInsights: (id: string) => authFetch(`/api/admin/leads/${id}/ai-insights`, {}, token).then((r) => r.json()),
      generateProposal: (id: string) =>
        authFetch(`/api/admin/leads/${id}/generate-proposal`, { method: "POST", body: "{}" }, token).then((r) => r.json()),
      convertToClient: (id: string) =>
        authFetch(`/api/admin/leads/${id}/convert-to-client`, { method: "POST", body: "{}" }, token).then((r) => r.json()),
      recalculateScore: (id: string) =>
        authFetch(`/api/admin/leads/${id}/recalculate-score`, { method: "POST", body: "{}" }, token).then((r) => r.json()),
      remove: (id: string) =>
        authFetch(`/api/admin/leads/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
    },
    clients: {
      list: (view?: string) => {
        const q = view && view !== "active" ? `?view=${encodeURIComponent(view)}` : "";
        return authFetch(`/api/admin/clients${q}`, {}, token).then((r) => r.json());
      },
      get: (id: string) => authFetch(`/api/admin/clients/${id}`, {}, token).then((r) => r.json()),
      summary: (id: string) => authFetch(`/api/admin/clients/${id}/summary`, {}, token).then((r) => r.json()),
      deletionPreview: (id: string) =>
        authFetch(`/api/admin/clients/${id}/deletion-preview`, {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/clients", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/clients/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      archive: (id: string) =>
        authFetch(`/api/admin/clients/${id}/archive`, { method: "POST" }, token).then((r) => r.json()),
      restore: (id: string) =>
        authFetch(`/api/admin/clients/${id}/restore`, { method: "POST" }, token).then((r) => r.json()),
      duplicate: (id: string) =>
        authFetch(`/api/admin/clients/${id}/duplicate`, { method: "POST" }, token).then((r) => r.json()),
      export: (id: string) => authFetch(`/api/admin/clients/${id}/export`, {}, token).then((r) => r.json()),
      remove: (id: string) =>
        authFetch(`/api/admin/clients/${id}`, { method: "DELETE" }, token).then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error ?? "Delete failed");
          return data;
        }),
      projects: (id: string) => authFetch(`/api/admin/clients/${id}/projects`, {}, token).then((r) => r.json()),
      invoices: (id: string) => authFetch(`/api/admin/clients/${id}/invoices`, {}, token).then((r) => r.json()),
      payments: (id: string) => authFetch(`/api/admin/clients/${id}/payments`, {}, token).then((r) => r.json()),
      timeline: (id: string) => authFetch(`/api/admin/clients/${id}/timeline`, {}, token).then((r) => r.json()),
      notes: (id: string) => authFetch(`/api/admin/clients/${id}/notes`, {}, token).then((r) => r.json()),
      addNote: (id: string, body: { body: string }) =>
        authFetch(`/api/admin/clients/${id}/notes`, { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          r.json(),
        ),
      communications: (id: string) => authFetch(`/api/admin/clients/${id}/communications`, {}, token).then((r) => r.json()),
      addCommunication: (id: string, body: { channel: string; subject?: string; body: string }) =>
        authFetch(`/api/admin/clients/${id}/communications`, { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          r.json(),
        ),
      sendPaymentReminder: async (
        id: string,
        body?: { invoice_id?: string; message?: string },
      ) => {
        const res = await authFetch(
          `/api/admin/clients/${id}/payment-reminder`,
          { method: "POST", body: JSON.stringify(body ?? {}) },
          token,
        );
        return parseJsonResponse<{
          ok: boolean;
          invoice_id: string;
          invoice_number: string;
          amount_cents: number;
          email_sent: boolean;
          notification_sent: boolean;
          portal_link: string;
        }>(res);
      },
    },
    portal: {
      inviteClient: async (
        clientId: string,
        body?: { email?: string; name?: string; role?: string },
      ) => {
        const res = await authFetch(
          `/api/admin/portal/clients/${clientId}/invite`,
          { method: "POST", body: JSON.stringify(body ?? {}) },
          token,
        );
        return parseJsonResponse<{
          ok: boolean;
          client_user_id: string;
          email_sent: boolean;
          invite_link: string;
        }>(res);
      },
    },
    projects: {
      list: (opts?: { clientId?: string; status?: string; archived?: string; search?: string }) => {
        const q = new URLSearchParams();
        if (opts?.clientId) q.set("client_id", opts.clientId);
        if (opts?.status) q.set("status", opts.status);
        if (opts?.archived) q.set("archived", opts.archived);
        if (opts?.search) q.set("search", opts.search);
        const qs = q.toString();
        return authFetch(`/api/admin/projects${qs ? `?${qs}` : ""}`, {}, token).then((r) => r.json());
      },
      stats: () => authFetch("/api/admin/projects/stats", {}, token).then((r) => r.json()),
      bulk: (body: { action: string; ids: string[] }) =>
        authFetch("/api/admin/projects/bulk", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
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
      addUpdate: (id: string, body: { body: string; visibility?: string; note_type?: string }) =>
        authFetch(`/api/admin/projects/${id}/updates`, { method: "POST", body: JSON.stringify(body) }, token).then(
          (r) => r.json(),
        ),
      updateMilestone: (id: string, mid: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/milestones/${mid}`, { method: "PATCH", body: JSON.stringify(body) }, token).then(
          (r) => r.json(),
        ),
      members: (id: string) => authFetch(`/api/admin/projects/${id}/members`, {}, token).then((r) => r.json()),
      addMember: (id: string, body: { user_id: string; role?: string }) =>
        authFetch(`/api/admin/projects/${id}/members`, { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          parseJsonResponse(r),
        ),
      removeMember: (id: string, userId: string) =>
        authFetch(`/api/admin/projects/${id}/members/${userId}`, { method: "DELETE" }, token).then((r) =>
          r.ok ? null : parseJsonResponse(r),
        ),
      summary: async (id: string) => {
        const r = await authFetch(`/api/admin/projects/${id}/summary`, {}, token);
        const data = await r.json();
        if (!r.ok) throw new Error(String(data.error ?? "Failed to load summary"));
        return data;
      },
      activity: (id: string) =>
        authFetch(`/api/admin/projects/${id}/activity`, {}, token).then((r) => parseJsonResponse(r)),
      feed: (id: string) => authFetch(`/api/admin/projects/${id}/feed`, {}, token).then((r) => parseJsonResponse(r)),
      analyze: async (id: string) => {
        const r = await authFetch(`/api/admin/projects/${id}/analyze`, { method: "POST", body: "{}" }, token);
        const data = await r.json();
        if (!r.ok) throw new Error(String(data.error ?? "Analysis failed"));
        return data;
      },
      generatePlan: async (id: string) => {
        const r = await authFetch(`/api/admin/projects/${id}/generate-plan`, { method: "POST", body: "{}" }, token);
        const data = await r.json();
        if (!r.ok) throw new Error(String(data.error ?? "Plan generation failed"));
        return data;
      },
      finance: (id: string) => authFetch(`/api/admin/projects/${id}/finance`, {}, token).then((r) => parseJsonResponse(r)),
      analytics: (id: string) => authFetch(`/api/admin/projects/${id}/analytics`, {}, token).then((r) => parseJsonResponse(r)),
      richTimeline: (id: string) =>
        authFetch(`/api/admin/projects/${id}/rich-timeline`, {}, token).then((r) => parseJsonResponse(r)),
      folders: (id: string) => authFetch(`/api/admin/projects/${id}/folders`, {}, token).then((r) => parseJsonResponse(r)),
      revisions: (id: string) => authFetch(`/api/admin/projects/${id}/revisions`, {}, token).then((r) => parseJsonResponse(r)),
      addRevision: (id: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/revisions`, { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          parseJsonResponse(r),
        ),
      updateRevision: (id: string, rid: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/revisions/${rid}`, { method: "PATCH", body: JSON.stringify(body) }, token).then(
          (r) => parseJsonResponse(r),
        ),
      removeRevision: async (id: string, rid: string) => {
        const r = await authFetch(`/api/admin/projects/${id}/revisions/${rid}`, { method: "DELETE" }, token);
        if (r.ok) return null;
        return parseJsonResponse(r);
      },
      changeOrders: (id: string) =>
        authFetch(`/api/admin/projects/${id}/change-orders`, {}, token).then((r) => parseJsonResponse(r)),
      addChangeOrder: (id: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/change-orders`, { method: "POST", body: JSON.stringify(body) }, token).then(
          (r) => parseJsonResponse(r),
        ),
      updateChangeOrder: (id: string, cid: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/change-orders/${cid}`, { method: "PATCH", body: JSON.stringify(body) }, token).then(
          (r) => parseJsonResponse(r),
        ),
      scope: (id: string) => authFetch(`/api/admin/projects/${id}/scope`, {}, token).then((r) => parseJsonResponse(r)),
      addScopeItem: (id: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/scope`, { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          parseJsonResponse(r),
        ),
      updateScopeItem: (id: string, sid: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/scope/${sid}`, { method: "PATCH", body: JSON.stringify(body) }, token).then(
          (r) => parseJsonResponse(r),
        ),
      removeScopeItem: async (id: string, sid: string) => {
        const r = await authFetch(`/api/admin/projects/${id}/scope/${sid}`, { method: "DELETE" }, token);
        if (r.ok) return null;
        return parseJsonResponse(r);
      },
      resources: (id: string) => authFetch(`/api/admin/projects/${id}/resources`, {}, token).then((r) => parseJsonResponse(r)),
      upsertResource: (id: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/resources`, { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          parseJsonResponse(r),
        ),
      removeResource: async (id: string, rid: string) => {
        const r = await authFetch(`/api/admin/projects/${id}/resources/${rid}`, { method: "DELETE" }, token);
        if (r.ok) return null;
        return parseJsonResponse(r);
      },
      deployment: (id: string) => authFetch(`/api/admin/projects/${id}/deployment`, {}, token).then((r) => parseJsonResponse(r)),
      updateDeployment: (id: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/deployment`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) =>
          parseJsonResponse(r),
        ),
      deploy: (id: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/deployment/deploy`, { method: "POST", body: JSON.stringify(body) }, token).then(
          (r) => parseJsonResponse(r),
        ),
      rollbackDeploy: (id: string, body: { history_id: string }) =>
        authFetch(`/api/admin/projects/${id}/deployment/rollback`, { method: "POST", body: JSON.stringify(body) }, token).then(
          (r) => parseJsonResponse(r),
        ),
      deliverableUrls: (id: string) =>
        authFetch(`/api/admin/projects/${id}/deliverable-urls`, {}, token).then((r) => parseJsonResponse(r)),
      addDeliverableUrl: (id: string, body: { label: string; url: string }) =>
        authFetch(`/api/admin/projects/${id}/deliverable-urls`, { method: "POST", body: JSON.stringify(body) }, token).then(
          (r) => parseJsonResponse(r),
        ),
      updateDeliverableUrl: (id: string, urlId: string, body: object) =>
        authFetch(`/api/admin/projects/${id}/deliverable-urls/${urlId}`, { method: "PATCH", body: JSON.stringify(body) }, token).then(
          (r) => parseJsonResponse(r),
        ),
      removeDeliverableUrl: async (id: string, urlId: string) => {
        const r = await authFetch(`/api/admin/projects/${id}/deliverable-urls/${urlId}`, { method: "DELETE" }, token);
        if (r.ok) return null;
        return parseJsonResponse(r);
      },
    },
    invoices: {
      list: (status?: string) =>
        authFetch(status ? `/api/admin/invoices?status=${status}` : "/api/admin/invoices", {}, token).then((r) => r.json()),
      summary: () => authFetch("/api/admin/invoices/summary", {}, token).then((r) => r.json()),
      activity: (id: string) => authFetch(`/api/admin/invoices/${id}/activity`, {}, token).then((r) => r.json()),
      intelligence: (id: string) => authFetch(`/api/admin/invoices/${id}/intelligence`, {}, token).then((r) => r.json()),
      get: (id: string) => authFetch(`/api/admin/invoices/${id}`, {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/invoices", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/invoices/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      items: (id: string) => authFetch(`/api/admin/invoices/${id}/items`, {}, token).then((r) => r.json()),
      addItem: (
        id: string,
        body: {
          description: string;
          quantity?: number;
          unit_price_cents: number;
          tax_percent?: number;
          discount_cents?: number;
        },
      ) =>
        authFetch(`/api/admin/invoices/${id}/items`, { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          r.json(),
        ),
      updateItem: (
        id: string,
        itemId: string,
        body: {
          description?: string;
          quantity?: number;
          unit_price_cents?: number;
          tax_percent?: number;
          discount_cents?: number;
        },
      ) =>
        authFetch(`/api/admin/invoices/${id}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(body) }, token).then(
          (r) => r.json(),
        ),
      removeItem: (id: string, itemId: string) =>
        authFetch(`/api/admin/invoices/${id}/items/${itemId}`, { method: "DELETE" }, token).then((r) =>
          r.ok ? null : r.json(),
        ),
      pdfUrl: (id: string) => `/api/admin/invoices/${id}/pdf`,
      paymentLink: (id: string) =>
        authFetch(`/api/admin/invoices/${id}/payment-link`, { method: "POST" }, token).then((r) => r.json()),
      send: (id: string) =>
        authFetch(`/api/admin/invoices/${id}/send`, { method: "POST" }, token).then((r) => parseJsonResponse(r)),
      sendPaymentReminder: async (id: string, body?: { message?: string }) => {
        const res = await authFetch(
          `/api/admin/invoices/${id}/payment-reminder`,
          { method: "POST", body: JSON.stringify(body ?? {}) },
          token,
        );
        return parseJsonResponse<{
          ok: boolean;
          invoice_id: string;
          invoice_number: string;
          amount_cents: number;
          email_sent: boolean;
          notification_sent: boolean;
          portal_link: string;
        }>(res);
      },
      remove: (id: string) =>
        authFetch(`/api/admin/invoices/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
    },
    payments: {
      dashboard: () => authFetch("/api/admin/payments/dashboard", {}, token).then((r) => r.json()),
    },
    team: {
      dashboard: () => authFetch("/api/admin/team/dashboard", {}, token).then((r) => r.json()),
      member: (userId: string) =>
        authFetch(`/api/admin/team/members/${userId}`, {}, token).then((r) => parseJsonResponse(r)),
      members: () => authFetch("/api/admin/team/members", {}, token).then((r) => r.json()),
      capacity: () => authFetch("/api/admin/team/capacity", {}, token).then((r) => r.json()),
      roles: () => authFetch("/api/admin/team/roles", {}, token).then((r) => r.json()),
      rolesDashboard: () => authFetch("/api/admin/team/roles/dashboard", {}, token).then((r) => r.json()),
      setMemberRole: (userId: string, curvvtech_role: string | null) =>
        authFetch(
          `/api/admin/team/members/${userId}`,
          { method: "PATCH", body: JSON.stringify({ curvvtech_role }) },
          token,
        ).then((r) => parseJsonResponse(r)),
      activity: (limit?: number) =>
        authFetch(limit ? `/api/admin/team/activity?limit=${limit}` : "/api/admin/team/activity", {}, token).then((r) =>
          r.json(),
        ),
      invitations: async () => {
        const res = await authFetch("/api/admin/team/invitations", {}, token);
        return parseJsonResponse<import("@/features/team/team-schemas").StaffInvitation[] | {
          invitations: import("@/features/team/team-schemas").StaffInvitation[];
        }>(res);
      },
      invite: async (body: { email: string; name?: string; role: string }) => {
        const res = await authFetch(
          "/api/admin/team/invitations",
          { method: "POST", body: JSON.stringify(body) },
          token,
        );
        return parseJsonResponse<
          import("@/features/team/team-schemas").StaffInvitation & {
            invite_url: string;
            email_sent?: boolean;
          }
        >(res);
      },
      revokeInvitation: async (id: string) => {
        const res = await authFetch(
          `/api/admin/team/invitations/${encodeURIComponent(id)}`,
          { method: "DELETE" },
          token,
        );
        if (res.ok) return null;
        return parseJsonResponse(res);
      },
    },
    analytics: {
      revenue: () => authFetch("/api/admin/analytics/revenue", {}, token).then((r) => r.json()),
      overview: () => authFetch("/api/admin/analytics/overview", {}, token).then((r) => parseJsonResponse(r)),
      ceo: () => authFetch("/api/admin/analytics/ceo", {}, token).then((r) => parseJsonResponse(r)),
    },
    demoRequests: {
      list: () => authFetch("/api/admin/demo-requests", {}, token).then((r) => r.json()),
      get: (id: string) => authFetch(`/api/admin/demo-requests/${id}`, {}, token).then((r) => r.json()),
      pipelineSummary: () => authFetch("/api/admin/demo-requests/pipeline-summary", {}, token).then((r) => r.json()),
      update: async (id: string, body: object) => {
        const res = await authFetch(`/api/admin/demo-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token);
        const data = await res.json();
        if (!res.ok) throw new Error(String(data.error ?? "Update failed"));
        return data;
      },
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
      analyzePending: async (limit = 10) => {
        const res = await authFetch("/api/admin/demo-requests/analyze-pending", {
          method: "POST",
          body: JSON.stringify({ limit }),
        }, token);
        const data = await res.json();
        if (!res.ok) throw new Error(String(data.error ?? "Batch analyze failed"));
        return data;
      },
      activity: (id: string) =>
        authFetch(`/api/admin/demo-requests/${id}/activity`, {}, token).then((r) => r.json()),
      analyze: async (id: string) => {
        const res = await authFetch(`/api/admin/demo-requests/${id}/analyze`, { method: "POST", body: "{}" }, token);
        const data = await res.json();
        if (!res.ok) throw new Error(String(data.error ?? "Analysis failed"));
        return data;
      },
      followUp: async (id: string, tone?: string) => {
        const res = await authFetch(
          `/api/admin/demo-requests/${id}/follow-up`,
          { method: "POST", body: JSON.stringify({ tone }) },
          token,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(String(data.error ?? "Follow-up failed"));
        return data;
      },
      aiAction: async (id: string, action: string) => {
        const res = await authFetch(
          `/api/admin/demo-requests/${id}/ai-action`,
          { method: "POST", body: JSON.stringify({ action }) },
          token,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(String(data.error ?? "AI action failed"));
        return data;
      },
      convertToLead: async (id: string) => {
        const res = await authFetch(`/api/admin/demo-requests/${id}/convert-to-lead`, { method: "POST", body: "{}" }, token);
        const data = await res.json();
        if (!res.ok) throw new Error(String(data.error ?? "Conversion failed"));
        return data;
      },
      convertToPipeline: async (id: string) => {
        const res = await authFetch(`/api/admin/demo-requests/${id}/convert-to-pipeline`, { method: "POST", body: "{}" }, token);
        const data = await res.json();
        if (!res.ok) throw new Error(String(data.error ?? "Pipeline conversion failed"));
        return data;
      },
      createProposal: async (id: string) => {
        const res = await authFetch(`/api/admin/demo-requests/${id}/create-proposal`, { method: "POST", body: "{}" }, token);
        const data = await res.json();
        if (!res.ok) throw new Error(String(data.error ?? "Proposal creation failed"));
        return data;
      },
    },
    chats: {
      list: (params?: { status?: string; limit?: number }) => {
        const q = new URLSearchParams();
        if (params?.status) q.set("status", params.status);
        if (params?.limit) q.set("limit", String(params.limit));
        const qs = q.toString();
        return authFetch(qs ? `/api/admin/chats?${qs}` : "/api/admin/chats", {}, token).then((r) => r.json());
      },
      analytics: () => authFetch("/api/admin/chats/analytics", {}, token).then((r) => r.json()),
      unreadCount: async () => {
        const res = await authFetch("/api/admin/inbox/unread-count", {}, token);
        const data = (await res.json()) as {
          unread_messages?: number;
          unread_conversations?: number;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? `unread-count failed (${res.status})`);
        }
        return {
          unread_messages: Number(data.unread_messages ?? 0),
          unread_conversations: Number(data.unread_conversations ?? 0),
        };
      },
      get: (id: string) => authFetch(`/api/admin/chats/${id}`, {}, token).then((r) => r.json()),
      update: (
        id: string,
        body: {
          status?: string;
          agent_takeover?: boolean;
          release_to_ai?: boolean;
          tags?: string[];
          priority?: string | null;
          assignee_id?: string | null;
          assignee_name?: string | null;
          notes?: string;
        },
      ) =>
        authFetch(`/api/admin/chats/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      sendMessage: (id: string, message: string) =>
        authFetch(`/api/admin/chats/${id}/messages`, { method: "POST", body: JSON.stringify({ message }) }, token).then(
          (r) => r.json(),
        ),
      markRead: (id: string) =>
        authFetch(`/api/admin/chats/${id}/mark-read`, { method: "POST" }, token).then((r) => r.json()),
      suggestReply: (id: string) =>
        authFetch(`/api/admin/chats/${id}/suggest-reply`, { method: "POST" }, token).then((r) => r.json()),
      summarize: (id: string) =>
        authFetch(`/api/admin/chats/${id}/summarize`, { method: "POST" }, token).then((r) => r.json()),
      convertToLead: (id: string) =>
        authFetch(`/api/admin/chats/${id}/convert-to-lead`, { method: "POST" }, token).then((r) => r.json()),
      sendTranscriptWhatsApp: (id: string, phone: string) =>
        authFetch(`/api/admin/chats/${id}/send-transcript-whatsapp`, { method: "POST", body: JSON.stringify({ phone }) }, token).then(
          (r) => r.json(),
        ),
    },
    tasks: {
      list: (params?: { project_id?: string; assignee_user_id?: string; status?: string; priority?: string; view?: string }) => {
        const q = new URLSearchParams();
        if (params?.project_id) q.set("project_id", params.project_id);
        if (params?.assignee_user_id) q.set("assignee_user_id", params.assignee_user_id);
        if (params?.status) q.set("status", params.status);
        if (params?.priority) q.set("priority", params.priority);
        if (params?.view) q.set("view", params.view);
        const qs = q.toString();
        return authFetch(qs ? `/api/admin/tasks?${qs}` : "/api/admin/tasks", {}, token).then((r) => r.json());
      },
      summary: () => authFetch("/api/admin/tasks/summary", {}, token).then((r) => r.json()),
      mine: async () => {
        const res = await authFetch("/api/admin/tasks/mine", {}, token);
        return parseJsonResponse<
          import("@/features/delivery/task-schemas").TaskRecord[] |
          { tasks: import("@/features/delivery/task-schemas").TaskRecord[] }
        >(res);
      },
      activity: (limit?: number) =>
        authFetch(limit ? `/api/admin/tasks/activity?limit=${limit}` : "/api/admin/tasks/activity", {}, token).then(
          (r) => r.json(),
        ),
      create: (body: object) =>
        authFetch("/api/admin/tasks", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) =>
          parseJsonResponse(r),
        ),
      comments: (id: string) =>
        authFetch(`/api/admin/tasks/${id}/comments`, {}, token).then((r) =>
          parseJsonResponse<Array<{
            id: string;
            task_id: string;
            author_user_id: string;
            author_name: string;
            body: string;
            created_at: string;
          }>>(r),
        ),
      addComment: (id: string, body: string) =>
        authFetch(`/api/admin/tasks/${id}/comments`, {
          method: "POST",
          body: JSON.stringify({ body }),
        }, token).then((r) => parseJsonResponse(r)),
      remove: (id: string) =>
        authFetch(`/api/admin/tasks/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
    },
    proposals: {
      list: () => authFetch("/api/admin/proposals", {}, token).then((r) => r.json()),
      pipelineSummary: () => authFetch("/api/admin/proposals/pipeline-summary", {}, token).then((r) => r.json()),
      templates: () => authFetch("/api/admin/proposals/templates", {}, token).then((r) => r.json()),
      get: (id: string) => authFetch(`/api/admin/proposals/${id}`, {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/proposals", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      createFromTemplate: (body: object) =>
        authFetch("/api/admin/proposals/from-template", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      contextPreview: (params: { lead_id?: string; client_id?: string }) => {
        const q = new URLSearchParams();
        if (params.lead_id) q.set("lead_id", params.lead_id);
        if (params.client_id) q.set("client_id", params.client_id);
        return authFetch(`/api/admin/proposals/context-preview?${q}`, {}, token).then((r) => r.json());
      },
      update: (id: string, body: object) =>
        authFetch(`/api/admin/proposals/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      remove: (id: string) =>
        authFetch(`/api/admin/proposals/${id}`, { method: "DELETE" }, token).then(async (r) => {
          if (!r.ok) {
            const data = await r.json().catch(() => ({}));
            throw new Error(String((data as { error?: string }).error ?? "Delete failed"));
          }
          return null;
        }),
      share: (id: string) =>
        authFetch(`/api/admin/proposals/${id}/share`, { method: "POST", body: "{}" }, token).then((r) => r.json()),
      duplicate: (id: string) =>
        authFetch(`/api/admin/proposals/${id}/duplicate`, { method: "POST", body: "{}" }, token).then((r) => r.json()),
      convertToProject: (id: string) =>
        authFetch(`/api/admin/proposals/${id}/convert-to-project`, { method: "POST", body: "{}" }, token).then((r) => r.json()),
      syncSections: async (id: string) => {
        const r = await authFetch(`/api/admin/proposals/${id}/sync-sections`, { method: "POST", body: "{}" }, token);
        const data = await r.json();
        if (!r.ok) throw new Error(String(data.error ?? data.message ?? "Failed to sync sections"));
        return data;
      },
      generateConsulting: async (id: string) => {
        const r = await authFetch(`/api/admin/proposals/${id}/generate-consulting`, { method: "POST", body: "{}" }, token);
        const data = await r.json();
        if (!r.ok) throw new Error(String(data.error ?? data.message ?? "AI generation failed"));
        return data;
      },
      events: (id: string) => authFetch(`/api/admin/proposals/${id}/events`, {}, token).then((r) => r.json()),
      analytics: (id: string) => authFetch(`/api/admin/proposals/${id}/analytics`, {}, token).then((r) => r.json()),
      addSection: (id: string, body: object) =>
        authFetch(`/api/admin/proposals/${id}/sections`, { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      pdfUrl: (id: string) => apiUrl(`/api/admin/proposals/${id}/pdf`),
      shareUrl: (shareToken: string) => {
        const base = import.meta.env.VITE_PROPOSAL_URL ?? "https://proposal.curvvtech.com";
        return `${base.replace(/\/$/, "")}/p/${shareToken}`;
      },
    },
    expenses: {
      list: (params?: { category?: string; status?: string }) => {
        const q = new URLSearchParams();
        if (params?.category) q.set("category", params.category);
        if (params?.status) q.set("status", params.status);
        const qs = q.toString();
        return authFetch(qs ? `/api/admin/expenses?${qs}` : "/api/admin/expenses", {}, token).then((r) => r.json());
      },
      dashboard: () => authFetch("/api/admin/expenses/dashboard", {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/expenses", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/expenses/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      remove: (id: string) =>
        authFetch(`/api/admin/expenses/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
    },
    payroll: {
      list: () => authFetch("/api/admin/payroll", {}, token).then((r) => r.json()),
      dashboard: () => authFetch("/api/admin/payroll/dashboard", {}, token).then((r) => r.json()),
      profiles: () => authFetch("/api/admin/payroll/profiles", {}, token).then((r) => r.json()),
      createProfile: (body: object) =>
        authFetch("/api/admin/payroll/profiles", { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          r.json(),
        ),
      updateProfile: (id: string, body: object) =>
        authFetch(`/api/admin/payroll/profiles/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) =>
          r.json(),
        ),
      removeProfile: (id: string) =>
        authFetch(`/api/admin/payroll/profiles/${id}`, { method: "DELETE" }, token).then((r) =>
          r.ok ? null : r.json(),
        ),
      get: (id: string) => authFetch(`/api/admin/payroll/${id}`, {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/payroll", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/payroll/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      addEntry: (id: string, body: object) =>
        authFetch(`/api/admin/payroll/${id}/entries`, { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      removeEntry: (runId: string, entryId: string) =>
        authFetch(`/api/admin/payroll/${runId}/entries/${entryId}`, { method: "DELETE" }, token).then((r) =>
          r.ok ? null : r.json(),
        ),
    },
    files: {
      list: (params?: { folder_id?: string; client_id?: string; project_id?: string; recent?: boolean }) => {
        const q = new URLSearchParams();
        if (params?.folder_id) q.set("folder_id", params.folder_id);
        if (params?.client_id) q.set("client_id", params.client_id);
        if (params?.project_id) q.set("project_id", params.project_id);
        if (params?.recent) q.set("recent", "1");
        const qs = q.toString();
        return authFetch(qs ? `/api/admin/files?${qs}` : "/api/admin/files", {}, token).then((r) => r.json());
      },
      summary: () => authFetch("/api/admin/files/summary", {}, token).then((r) => r.json()),
      activity: (limit?: number) =>
        authFetch(limit ? `/api/admin/files/activity?limit=${limit}` : "/api/admin/files/activity", {}, token).then(
          (r) => r.json(),
        ),
      organize: async () => {
        const r = await authFetch("/api/admin/files/organize", { method: "POST", body: "{}" }, token);
        const data = await r.json();
        if (!r.ok) throw new Error(String(data.error ?? "Organize failed"));
        return data;
      },
      update: (id: string, body: object) =>
        authFetch(`/api/admin/files/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      folders: (params?: { parent_id?: string; project_id?: string; client_id?: string }) => {
        const q = new URLSearchParams();
        if (params?.parent_id) q.set("parent_id", params.parent_id);
        if (params?.project_id) q.set("project_id", params.project_id);
        if (params?.client_id) q.set("client_id", params.client_id);
        const qs = q.toString();
        return authFetch(qs ? `/api/admin/files/folders?${qs}` : "/api/admin/files/folders", {}, token).then((r) => r.json());
      },
      createFolder: (body: object) =>
        authFetch("/api/admin/files/folders", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      uploadUrl: (body: object) =>
        authFetch("/api/admin/files/upload-url", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      versions: (id: string) => authFetch(`/api/admin/files/${id}/versions`, {}, token).then((r) => r.json()),
      remove: (id: string) =>
        authFetch(`/api/admin/files/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
      downloadUrl: (id: string, opts?: { inline?: boolean }) => {
        const q = opts?.inline ? "?inline=1" : "";
        return authFetch(`/api/admin/files/${id}/download-url${q}`, {}, token).then((r) => r.json());
      },
    },
    workflows: {
      list: () => authFetch("/api/admin/workflows", {}, token).then((r) => r.json()),
      create: (body: object) =>
        authFetch("/api/admin/workflows", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      update: (id: string, body: object) =>
        authFetch(`/api/admin/workflows/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      remove: (id: string) =>
        authFetch(`/api/admin/workflows/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
      runs: (limit?: number) =>
        authFetch(limit ? `/api/admin/workflows/runs?limit=${limit}` : "/api/admin/workflows/runs", {}, token).then((r) =>
          r.json(),
        ),
    },
    integrations: {
      list: () => authFetch("/api/admin/integrations", {}, token).then((r) => r.json()),
      connect: (body: object) =>
        authFetch("/api/admin/integrations/connect", { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          r.json(),
        ),
      disconnect: (provider: string) =>
        authFetch("/api/admin/integrations/disconnect", { method: "POST", body: JSON.stringify({ provider }) }, token).then(
          (r) => r.json(),
        ),
      oauthUrl: (provider: string) =>
        authFetch(`/api/admin/integrations/oauth-url/${provider}`, {}, token).then((r) => r.json()),
    },
    ai: {
      proposal: (body: object) =>
        authFetch("/api/admin/ai/proposal", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      invoice: (body: object) =>
        authFetch("/api/admin/ai/invoice", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      emailDraft: (body: object) =>
        authFetch("/api/admin/ai/email-draft", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      clientSummary: (body: object) =>
        authFetch("/api/admin/ai/client-summary", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      projectReport: (body: object) =>
        authFetch("/api/admin/ai/project-report", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      closeProbability: (body: object) =>
        authFetch("/api/admin/ai/close-probability", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      summarizeLead: (body: object) =>
        authFetch("/api/admin/ai/summarize-lead", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      meetingQuestions: (body: object) =>
        authFetch("/api/admin/ai/meeting-questions", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      proposalAction: async (body: object) => {
        const r = await authFetch("/api/admin/ai/proposal-action", { method: "POST", body: JSON.stringify(body) }, token);
        const data = await r.json();
        if (!r.ok) throw new Error(String(data.error ?? data.message ?? "AI request failed"));
        return data;
      },
      paymentReminder: (body: object) =>
        authFetch("/api/admin/ai/payment-reminder", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
      scanReceipt: (body: object) =>
        authFetch("/api/admin/ai/scan-receipt", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
    },
    company: {
      get: () => authFetch("/api/admin/company", {}, token).then((r) => r.json()),
      update: (body: object) =>
        authFetch("/api/admin/company", { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
      sessions: () => authFetch("/api/admin/company/sessions", {}, token).then((r) => r.json()),
    },
    content: {
      services: {
        list: () => authFetch("/api/admin/content/services", {}, token).then((r) => r.json()),
        create: (body: object) =>
          authFetch("/api/admin/content/services", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
        update: (id: string, body: object) =>
          authFetch(`/api/admin/content/services/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
        remove: (id: string) =>
          authFetch(`/api/admin/content/services/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
      },
      portfolio: {
        list: () => authFetch("/api/admin/content/portfolio", {}, token).then((r) => r.json()),
        create: (body: object) =>
          authFetch("/api/admin/content/portfolio", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
        update: (id: string, body: object) =>
          authFetch(`/api/admin/content/portfolio/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) => r.json()),
        remove: (id: string) =>
          authFetch(`/api/admin/content/portfolio/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
      },
      testimonials: {
        list: () => authFetch("/api/admin/content/testimonials", {}, token).then((r) => r.json()),
        create: (body: object) =>
          authFetch("/api/admin/content/testimonials", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
        update: (id: string, body: object) =>
          authFetch(`/api/admin/content/testimonials/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) =>
            r.json(),
          ),
        remove: (id: string) =>
          authFetch(`/api/admin/content/testimonials/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
      },
      teamMembers: {
        list: () => authFetch("/api/admin/content/team-members", {}, token).then((r) => r.json()),
        create: (body: object) =>
          authFetch("/api/admin/content/team-members", { method: "POST", body: JSON.stringify(body) }, token).then((r) => r.json()),
        update: (id: string, body: object) =>
          authFetch(`/api/admin/content/team-members/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token).then((r) =>
            r.json(),
          ),
        remove: (id: string) =>
          authFetch(`/api/admin/content/team-members/${id}`, { method: "DELETE" }, token).then((r) => (r.ok ? null : r.json())),
      },
    },
    search: (q: string) =>
      authFetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {}, token).then((r) => r.json()),
    approvals: {
      list: (params: { project_id?: string; client_id?: string; status?: string }) => {
        const q = new URLSearchParams();
        if (params.project_id) q.set("project_id", params.project_id);
        if (params.client_id) q.set("client_id", params.client_id);
        if (params.status) q.set("status", params.status);
        return authFetch(`/api/admin/approvals?${q}`, {}, token).then((r) => parseJsonResponse(r));
      },
      create: (body: {
        project_id?: string;
        client_id?: string;
        entity_type: string;
        entity_id?: string;
        title: string;
        description?: string;
        review_url?: string;
      }) =>
        authFetch("/api/admin/approvals", { method: "POST", body: JSON.stringify(body) }, token).then((r) =>
          parseJsonResponse(r),
        ),
      remove: async (id: string) => {
        const r = await authFetch(`/api/admin/approvals/${id}`, { method: "DELETE" }, token);
        if (r.ok) return null;
        return parseJsonResponse(r);
      },
    },
    notifications: {
      list: async (opts?: { unreadOnly?: boolean; limit?: number }) => {
        const q = new URLSearchParams();
        if (opts?.unreadOnly) q.set("unread", "true");
        if (opts?.limit) q.set("limit", String(opts.limit));
        const qs = q.toString();
        const res = await authFetch(`/api/admin/notifications${qs ? `?${qs}` : ""}`, {}, token);
        return parseJsonResponse<{
          notifications: {
            id: string;
            title: string;
            body: string;
            type: string;
            href: string | null;
            created_at: string;
            read: boolean;
          }[];
          unread_count: number;
        }>(res);
      },
      unreadCount: () =>
        authFetch("/api/admin/notifications/unread-count", {}, token).then((r) =>
          parseJsonResponse<{ unread_count: number }>(r),
        ),
      markRead: (key: string) =>
        authFetch(`/api/admin/notifications/${encodeURIComponent(key)}/read`, { method: "POST" }, token).then((r) =>
          parseJsonResponse<{ ok: boolean }>(r),
        ),
      markAllRead: () =>
        authFetch("/api/admin/notifications/mark-read", { method: "POST" }, token).then((r) =>
          parseJsonResponse<{ ok: boolean }>(r),
        ),
    },
    careers: {
      roles: () =>
        authFetch("/api/admin/careers/roles", {}, token).then((r) =>
          parseJsonResponse<{ roles: import("@/features/careers/careers.types").CareerRoleSummary[] }>(r),
        ),
      list: (filters?: { role_slug?: string; status?: "new" | "shortlisted" | "rejected" | "all" }) => {
        const q = new URLSearchParams();
        if (filters?.role_slug) q.set("role_slug", filters.role_slug);
        if (filters?.status) q.set("status", filters.status);
        const qs = q.toString();
        return authFetch(qs ? `/api/admin/careers/applications?${qs}` : "/api/admin/careers/applications", {}, token).then(
          (r) =>
            parseJsonResponse<{ applications: import("@/features/careers/careers.types").CareerApplication[] }>(r),
        );
      },
      get: (id: string) =>
        authFetch(`/api/admin/careers/applications/${id}`, {}, token).then((r) =>
          parseJsonResponse<import("@/features/careers/careers.types").CareerApplication>(r),
        ),
      setup: () =>
        authFetch("/api/admin/careers/setup", {}, token).then((r) =>
          parseJsonResponse<{
            email_configured: boolean;
            calendar_connected: boolean;
            from_address: string;
            reply_to: string;
          }>(r),
        ),
      shortlist: (id: string, body: { starts_at: string; duration_min?: number; note?: string }) =>
        authFetch(`/api/admin/careers/applications/${id}/shortlist`, { method: "POST", body: JSON.stringify(body) }, token).then(
          (r) =>
            parseJsonResponse<
              import("@/features/careers/careers.types").CareerApplication & {
                meet_created: boolean;
                calendar_error: string | null;
              }
            >(r),
        ),
      reject: (id: string, body?: { send_email?: boolean; note?: string }) =>
        authFetch(`/api/admin/careers/applications/${id}/reject`, { method: "POST", body: JSON.stringify(body ?? {}) }, token).then(
          (r) =>
            parseJsonResponse<
              import("@/features/careers/careers.types").CareerApplication & { email_sent: boolean }
            >(r),
        ),
      updateStatus: (id: string, status: "new") =>
        authFetch(
          `/api/admin/careers/applications/${id}`,
          { method: "PATCH", body: JSON.stringify({ status }) },
          token,
        ).then((r) => parseJsonResponse<import("@/features/careers/careers.types").CareerApplication>(r)),
      resumeBlob: async (id: string) => {
        const res = await authFetch(`/api/admin/careers/applications/${id}/resume`, {}, token);
        if (!res.ok) throw new Error("Could not load CV");
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) throw new Error("Could not load CV");
        return res.blob();
      },
    },
  };
}
