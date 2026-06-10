import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "followup_active_tenant_id";

export async function getStoredTenantId(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

export async function setStoredTenantId(tenantId: string | null): Promise<void> {
  try {
    if (!tenantId) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, tenantId);
  } catch {
    /* ignore */
  }
}
