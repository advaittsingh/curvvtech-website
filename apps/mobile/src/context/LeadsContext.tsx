import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTenant } from "./TenantContext";
import { fetchMergedLeads, formatUserFacingApiError, type Lead } from "../services/api";

type LeadsContextValue = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const {
    activeTenantId,
    isLoading: tenantsLoading,
    tenantResolutionReady,
  } = useTenant();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tenantResolutionReady) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMergedLeads(activeTenantId);
      setLeads(data);
    } catch (e) {
      setError(formatUserFacingApiError(e));
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, tenantResolutionReady]);

  useEffect(() => {
    if (tenantsLoading || !tenantResolutionReady) return;
    void refresh();
  }, [tenantsLoading, tenantResolutionReady, refresh]);

  const value = useMemo(
    () => ({ leads, loading, error, refresh }),
    [leads, loading, error, refresh]
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
