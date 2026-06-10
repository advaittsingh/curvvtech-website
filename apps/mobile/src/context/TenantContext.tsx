import { useQuery } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchTenants, type TenantRow } from "../services/inboxApi";
import { getStoredTenantId, setStoredTenantId } from "../storage/tenantStorage";

type TenantContextValue = {
  tenants: TenantRow[];
  activeTenantId: string | null;
  /** False only while resolving stored org for multi-tenant users (avoids wrong X-Tenant-Id). */
  tenantResolutionReady: boolean;
  isLoading: boolean;
  error: Error | null;
  setActiveTenant: (id: string) => Promise<void>;
  refetchTenants: () => Promise<unknown>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const {
    data: tenants = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenants"],
    queryFn: fetchTenants,
    staleTime: 30_000,
    retry: 2,
    refetchOnReconnect: true,
  });

  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [tenantResolutionReady, setTenantResolutionReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (tenants.length === 0) {
      setActiveTenantId(null);
      setTenantResolutionReady(true);
      return;
    }
    if (tenants.length === 1) {
      const id = tenants[0]!.id;
      setActiveTenantId(id);
      setTenantResolutionReady(true);
      void setStoredTenantId(id);
      return;
    }
    setTenantResolutionReady(false);
    let cancelled = false;
    (async () => {
      const stored = await getStoredTenantId();
      const next =
        stored && tenants.some((t) => t.id === stored) ? stored : tenants[0]!.id;
      if (!cancelled) {
        setActiveTenantId(next);
        await setStoredTenantId(next);
        setTenantResolutionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenants, isLoading]);

  const setActiveTenant = useCallback(async (id: string) => {
    setActiveTenantId(id);
    await setStoredTenantId(id);
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenants,
      activeTenantId,
      tenantResolutionReady,
      isLoading,
      error: error instanceof Error ? error : error ? new Error(String(error)) : null,
      setActiveTenant,
      refetchTenants: refetch,
    }),
    [tenants, activeTenantId, tenantResolutionReady, isLoading, error, setActiveTenant, refetch]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
