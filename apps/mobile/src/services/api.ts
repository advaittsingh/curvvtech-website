import axios, { type InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "../config/apiBaseUrl";
import type { BusinessProfile, BusinessQuestionnaire, UserProfileDetails } from "../storage/appStorage";
import { authStorage } from "./authStorage";

/** Default cap; long operations (e.g. AI) pass a higher `timeout` per request. */
const DEFAULT_TIMEOUT_MS = 15000;

/** Refresh access before expiry to avoid bursts of 401 + retry. */
const TOKEN_REFRESH_LEEWAY_MS = 90_000;

/** One in-flight refresh for all callers (parallel 401s, proactive refresh, cold start). */
let refreshInFlight: Promise<boolean> | null = null;

async function performTokenRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refresh = await authStorage.getRefreshToken();
    if (!refresh) return false;
    try {
      const { data } = await plainHttp.post<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
      }>("/auth/refresh", { refresh_token: refresh });
      await authStorage.setTokens(data.access_token, data.refresh_token, data.expires_in);
      return true;
    } catch {
      await authStorage.clearTokens();
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** No auth interceptors — login / refresh only (avoids infinite retry loops). */
export const plainHttp = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

export type PasswordAuthUser = {
  id: string;
  email: string | null;
  access_allowed: boolean;
  waitlist_position: number | null;
};

export type PasswordAuthPayload = {
  user: PasswordAuthUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

/** User-facing copy for login/signup failures (no backend shape changes). */
export function describeAuthHttpError(
  e: unknown,
  flow: "signin" | "signup"
): { title: string; message: string } {
  const title = flow === "signin" ? "Sign in failed" : "Sign up failed";
  if (!axios.isAxiosError(e)) {
    return {
      title,
      message: e instanceof Error ? e.message : "Something went wrong. Try again.",
    };
  }
  const st = e.response?.status;
  const d = e.response?.data as { error?: string; message?: string } | undefined;
  const serverHint = d?.message || d?.error;

  if (st === 401 && flow === "signin") {
    return { title, message: "Incorrect email or password." };
  }
  if (st === 409 && flow === "signup") {
    return { title: "Account exists", message: "Try signing in instead, or use a different email." };
  }
  if (st === 400) {
    return {
      title,
      message: serverHint || "Check your email format and password (6+ characters).",
    };
  }
  if (st === 403) {
    return { title, message: serverHint || "Access was denied. Try again or contact support." };
  }
  if (st === 429) {
    return {
      title: "Too many attempts",
      message: "Please wait a minute and try again.",
    };
  }
  if (st != null && st >= 500) {
    return {
      title: "Server error",
      message: "We couldn’t reach the service. Try again in a moment.",
    };
  }
  if (e.code === "ECONNABORTED" || e.message?.toLowerCase().includes("timeout")) {
    return {
      title: "Connection timed out",
      message: "Check your network and try again.",
    };
  }
  if (!e.response && (e.message === "Network Error" || e.code === "ERR_NETWORK")) {
    return {
      title: "Can’t connect",
      message:
        "Check Wi‑Fi or cellular data. If you’re on a device, confirm EXPO_PUBLIC_API_URL points at a reachable API.",
    };
  }
  return {
    title,
    message: serverHint || e.message || "Something went wrong. Try again.",
  };
}

export async function loginPassword(email: string, password: string): Promise<PasswordAuthPayload> {
  const { data } = await plainHttp.post<PasswordAuthPayload>("/auth/login", { email, password });
  return data;
}

export async function signupPassword(email: string, password: string): Promise<PasswordAuthPayload> {
  const { data } = await plainHttp.post<PasswordAuthPayload>("/auth/signup", { email, password });
  return data;
}

/** Call on cold start when access token is missing but refresh may exist. */
export async function tryRefreshAccessToken(): Promise<boolean> {
  return performTokenRefresh();
}

/** Best-effort server-side session invalidation (always clear local tokens after). */
export async function logoutRemote(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    /* offline or expired — still log out locally */
  }
}

async function refreshAccessAndRetry(
  cfg: InternalAxiosRequestConfig & { _retry?: boolean }
): Promise<boolean> {
  const ok = await performTokenRefresh();
  if (!ok) return false;
  const token = await authStorage.getAccessToken();
  if (!token) return false;
  cfg._retry = true;
  cfg.headers = cfg.headers ?? {};
  cfg.headers.Authorization = `Bearer ${token}`;
  return true;
}

api.interceptors.request.use(async (config) => {
  const refresh = await authStorage.getRefreshToken();
  if (refresh) {
    const access = await authStorage.getAccessToken();
    if (!access) {
      await performTokenRefresh();
    } else {
      const exp = await authStorage.getAccessExpiresAtMs();
      if (exp != null && exp < Date.now() + TOKEN_REFRESH_LEEWAY_MS) {
        await performTokenRefresh();
      }
    }
  }
  const token = await authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }
    const status = error.response?.status;
    const cfg = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (status !== 401 || cfg._retry) {
      return Promise.reject(error);
    }
    const path = String(cfg.url ?? "");
    if (path.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    const ok = await refreshAccessAndRetry(cfg);
    if (!ok) {
      return Promise.reject(error);
    }
    return api.request(cfg);
  }
);

/** Parsed / manual leads (`/v1/leads`). */
export type ManualLead = {
  source: "manual";
  id: number;
  contact_name: string;
  raw_text: string;
  summary: string;
  status: string;
  follow_up_at: string | null;
  created_at: string;
};

/** WhatsApp CRM rows (`/v1/wa/leads`). */
export type WhatsAppLead = {
  source: "whatsapp";
  id: string;
  conversation_id: string;
  contact_name: string;
  raw_text: string;
  summary: string;
  status: string;
  follow_up_at: null;
  created_at: string;
  score: number;
  customer_phone_e164: string | null;
};

export type Lead = ManualLead | WhatsAppLead;

export function isManualLead(lead: Lead): lead is ManualLead {
  return lead.source === "manual";
}

export function isWhatsAppLead(lead: Lead): lead is WhatsAppLead {
  return lead.source === "whatsapp";
}

type WaLeadApiRow = {
  id: string;
  conversation_id: string;
  status: string;
  score: number;
  summary: string;
  follow_up_text: string;
  updated_at: string;
  customer_wa_id: string;
  customer_phone_e164: string | null;
  last_message_at: string;
};

function mapWaRowToLead(row: WaLeadApiRow): WhatsAppLead {
  const display =
    row.customer_phone_e164?.trim() ||
    (row.customer_wa_id.startsWith("+") ? row.customer_wa_id : `+${row.customer_wa_id}`);
  const created = row.last_message_at || row.updated_at;
  return {
    source: "whatsapp",
    id: row.id,
    conversation_id: row.conversation_id,
    contact_name: display,
    raw_text: row.follow_up_text?.trim() || row.summary,
    summary: row.summary,
    status: row.status,
    follow_up_at: null,
    created_at: created,
    score: row.score,
    customer_phone_e164: row.customer_phone_e164,
  };
}

export type ParseLeadResponse = {
  id: number;
  contact_name: string;
  summary: string;
  status: string;
};

export type MeResponse = {
  id: string;
  access_allowed: boolean;
  waitlist_position: number | null;
  email: string | null;
};

export type ServerProfile = {
  display_name: string;
  phone: string;
  email: string;
  business_address: string;
  business_website: string;
  profile_photo_s3_key: string | null;
  id_document_s3_key: string | null;
  id_verification_status: string;
};

function errMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as { error?: string; message?: string } | undefined;
    const serverMsg = d?.message || d?.error || "";
    const lowerServerMsg = serverMsg.toLowerCase();

    if (
      lowerServerMsg.includes("error validating access token") ||
      lowerServerMsg.includes("graph api 401")
    ) {
      return "WhatsApp is disconnected because the Graph token expired. Ask your admin to update WHATSAPP_GRAPH_ACCESS_TOKEN on the server, then retry.";
    }

    if (e.response?.status === 401) {
      if (d?.error === "Missing bearer token") {
        return "Sign in again — your session was not sent to the server.";
      }
      return d?.message || d?.error || "Session expired. Sign in again.";
    }
    if (e.response?.status === 404 && !serverMsg) {
      return "The requested record was not found. Refresh and try again.";
    }
    if (d?.message) return d.message;
    if (d?.error) return d.error;
    if (e.code === "ECONNABORTED" || e.message?.toLowerCase().includes("timeout")) {
      return "Request timed out. Check Wi‑Fi and that the API is running.";
    }
    if (!e.response && (e.message === "Network Error" || e.code === "ERR_NETWORK")) {
      return "Can't reach the server. On a physical device, set EXPO_PUBLIC_API_URL in mobile/.env to your Mac's LAN IP (same Wi‑Fi), then restart Expo.";
    }
    return e.message || "Request failed";
  }
  return e instanceof Error ? e.message : "Request failed";
}

/** Stable, user-safe message for any failed API call (lists, forms, etc.). */
export function formatUserFacingApiError(e: unknown): string {
  return errMessage(e);
}

/** Rethrows Axios errors so callers can inspect `response.status` (e.g. 401 on boot). */
export async function fetchMe(options?: { timeout?: number }): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>("/v1/me", {
    timeout: options?.timeout ?? DEFAULT_TIMEOUT_MS,
  });
  return data;
}

async function fetchManualLeads(): Promise<ManualLead[]> {
  const { data } = await api.get<
    {
      id: number;
      contact_name: string;
      raw_text: string;
      summary: string;
      status: string;
      follow_up_at: string | null;
      created_at: string;
    }[]
  >("/v1/leads", { timeout: 12000 });
  return data.map((row) => ({ ...row, source: "manual" as const }));
}

async function fetchWaLeadsForTenant(tenantId: string): Promise<WhatsAppLead[]> {
  const { data } = await api.get<{ leads: WaLeadApiRow[] }>("/v1/wa/leads", {
    timeout: 12000,
    headers: { "X-Tenant-Id": tenantId },
  });
  return data.leads.map(mapWaRowToLead);
}

/** Manual + WhatsApp CRM leads, newest first. */
export async function fetchMergedLeads(activeTenantId: string | null): Promise<Lead[]> {
  try {
    const [manual, wa] = await Promise.all([
      fetchManualLeads(),
      activeTenantId
        ? fetchWaLeadsForTenant(activeTenantId).catch(() => [] as WhatsAppLead[])
        : Promise.resolve([] as WhatsAppLead[]),
    ]);
    const merged: Lead[] = [...manual, ...wa];
    merged.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return tb - ta;
    });
    return merged;
  } catch (e) {
    throw new Error(formatUserFacingApiError(e));
  }
}

export async function createLead(text: string): Promise<ParseLeadResponse> {
  try {
    const { data } = await api.post<ParseLeadResponse>("/v1/parse-lead", { text }, { timeout: 60_000 });
    return data;
  } catch (e) {
    throw new Error(formatUserFacingApiError(e));
  }
}

export async function updateLead(
  id: number,
  patch: { status?: string; follow_up_at?: string | null }
): Promise<ManualLead> {
  try {
    const { data } = await api.patch<Omit<ManualLead, "source">>(`/v1/leads/${id}`, patch);
    return { ...data, source: "manual" };
  } catch (e) {
    throw new Error(errMessage(e));
  }
}

export type LeadInsightsResponse = {
  business_summary: string;
  suggestions: string[];
  ai_enabled: boolean;
};

function tenantHeaders(tenantId: string) {
  return { "X-Tenant-Id": tenantId };
}

export async function postWaLeadGenerateInsights(
  tenantId: string,
  leadId: string
): Promise<LeadInsightsResponse> {
  try {
    const { data } = await api.post<LeadInsightsResponse>(
      `/v1/wa/leads/${encodeURIComponent(leadId)}/generate-insights`,
      {},
      { headers: tenantHeaders(tenantId), timeout: 90_000 }
    );
    return data;
  } catch (e) {
    throw new Error(errMessage(e));
  }
}

export async function postWaLeadFollowUpDraft(
  tenantId: string,
  leadId: string
): Promise<{ text: string; ai_enabled: boolean }> {
  try {
    const { data } = await api.post<{ text: string; ai_enabled: boolean }>(
      `/v1/wa/leads/${encodeURIComponent(leadId)}/follow-up-draft`,
      {},
      { headers: tenantHeaders(tenantId), timeout: 90_000 }
    );
    return data;
  } catch (e) {
    throw new Error(errMessage(e));
  }
}

export async function postManualLeadGenerateInsights(leadId: number): Promise<LeadInsightsResponse> {
  try {
    const { data } = await api.post<LeadInsightsResponse>(
      `/v1/leads/${leadId}/generate-insights`,
      {},
      { timeout: 90_000 }
    );
    return data;
  } catch (e) {
    throw new Error(errMessage(e));
  }
}

export async function postManualLeadFollowUpDraft(leadId: number): Promise<{ text: string; ai_enabled: boolean }> {
  try {
    const { data } = await api.post<{ text: string; ai_enabled: boolean }>(
      `/v1/leads/${leadId}/follow-up-draft`,
      {},
      { timeout: 90_000 }
    );
    return data;
  } catch (e) {
    throw new Error(errMessage(e));
  }
}

export async function fetchServerProfile(): Promise<ServerProfile> {
  const { data } = await api.get<ServerProfile>("/v1/me/profile");
  return data;
}

export type ServerBusiness = {
  what_you_do: string;
  customer_asks: string;
  customer_source: string;
  description: string;
  questionnaire: BusinessQuestionnaire | null;
};

export async function fetchServerBusiness(): Promise<ServerBusiness> {
  const { data } = await api.get<ServerBusiness>("/v1/me/business");
  return data;
}

export async function patchServerProfile(
  patch: Partial<{
    display_name: string;
    phone: string;
    email: string;
    business_address: string;
    business_website: string;
    profile_photo_s3_key: string | null;
    id_document_s3_key: string | null;
    id_verification_status: string;
  }>
): Promise<ServerProfile> {
  const { data } = await api.patch<ServerProfile>("/v1/me/profile", patch);
  return data;
}

export function profileToServerPatch(d: UserProfileDetails): Record<string, unknown> {
  return {
    display_name: d.displayName,
    phone: d.phone,
    email: d.email,
    business_address: d.businessAddress,
    business_website: d.businessWebsite,
    id_verification_status: d.idVerificationStatus,
  };
}

export async function patchServerBusiness(profile: BusinessProfile): Promise<void> {
  await api.patch("/v1/me/business", {
    what_you_do: profile.whatYouDo,
    customer_asks: profile.customerAsks,
    customer_source: profile.customerSource,
    description: profile.description,
    questionnaire: profile.questionnaire ?? null,
  });
}

export async function sendAiChatMessage(message: string): Promise<string> {
  try {
    const { data } = await api.post<{ reply: string }>(
      "/v1/ai/chat",
      { message },
      { timeout: 60000 }
    );
    return data.reply;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const d = e.response?.data as { message?: string; error?: string } | undefined;
      const hint = d?.message ?? d?.error;
      if (hint) throw new Error(hint);
    }
    throw e;
  }
}

export async function fetchAiChatMessages(): Promise<
  { id: string; role: string; content: string; created_at: string }[]
> {
  const { data } = await api.get<{
    messages: { id: string; role: string; content: string; created_at: string }[];
  }>("/v1/ai/chat/messages", { params: { limit: 200 } });
  return data.messages;
}

export async function deleteAiChatMessages(): Promise<void> {
  await api.delete("/v1/ai/chat/messages");
}

export async function sendFeedback(body: {
  subject?: string;
  message: string;
  app_version?: string;
  platform?: string;
}): Promise<void> {
  await api.post("/v1/feedback", body);
}

export async function requestProfileUploadUrl(
  purpose: "profile_photo" | "id_document",
  contentType: string
): Promise<{ url: string; key: string; expiresIn: number }> {
  const { data } = await api.post<{ url: string; key: string; expiresIn: number }>(
    "/v1/me/profile/upload-url",
    { purpose, content_type: contentType }
  );
  return data;
}

export type WhatsappSettingsResponse = {
  whatsapp_phone_number_id: string | null;
};

export async function fetchWhatsappSettings(tenantId?: string | null): Promise<WhatsappSettingsResponse> {
  try {
    const { data } = await api.get<WhatsappSettingsResponse>("/v1/me/whatsapp", {
      headers: tenantId ? { "X-Tenant-Id": tenantId } : undefined,
    });
    return data;
  } catch (e) {
    throw new Error(errMessage(e));
  }
}

export async function patchWhatsappSettings(
  whatsapp_phone_number_id: string | null,
  tenantId?: string | null
): Promise<void> {
  try {
    await api.patch("/v1/me/whatsapp", { whatsapp_phone_number_id }, {
      headers: tenantId ? { "X-Tenant-Id": tenantId } : undefined,
    });
  } catch (e) {
    throw new Error(errMessage(e));
  }
}
