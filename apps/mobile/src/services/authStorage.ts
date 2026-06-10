import * as SecureStore from "expo-secure-store";

const K_ACCESS = "fu_access_token";
const K_REFRESH = "fu_refresh_token";
const K_EXPIRY = "fu_access_expiry";

export const authStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(K_ACCESS);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(K_REFRESH);
    } catch {
      return null;
    }
  },

  async setTokens(access: string, refresh?: string | null, expiresInSec?: number) {
    await SecureStore.setItemAsync(K_ACCESS, access);
    if (refresh) await SecureStore.setItemAsync(K_REFRESH, refresh);
    if (expiresInSec != null) {
      const at = Date.now() + expiresInSec * 1000;
      await SecureStore.setItemAsync(K_EXPIRY, String(at));
    }
  },

  async clearTokens() {
    for (const k of [K_ACCESS, K_REFRESH, K_EXPIRY]) {
      try {
        await SecureStore.deleteItemAsync(k);
      } catch {
        /* ignore missing keys */
      }
    }
  },

  /** Milliseconds since epoch when access token expires, or null if unknown. */
  async getAccessExpiresAtMs(): Promise<number | null> {
    try {
      const raw = await SecureStore.getItemAsync(K_EXPIRY);
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  },
};
