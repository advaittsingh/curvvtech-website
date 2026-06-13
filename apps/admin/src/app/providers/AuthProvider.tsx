import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCurrentUser,
  loginWithPassword,
  logoutSession,
  refreshSession,
} from "@/features/auth/api";
import {
  canAccessAdminPanel,
  hasPermission as checkPermission,
  permissionsForUser,
} from "@/lib/permissions";
import { getAccessToken, isSessionPresent } from "@/lib/session";
import type { AdminRole, AuthUser, Permission } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  role: AdminRole | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  hasPermission: (required: Permission | Permission[], mode?: "any" | "all") => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUser(): Promise<AuthUser | null> {
  if (!isSessionPresent()) return null;
  let user = await fetchCurrentUser();
  if (user) return user;

  const refreshed = await refreshSession();
  if (!refreshed) return null;
  return fetchCurrentUser();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await loadUser();
      if (next && !canAccessAdminPanel(next.curvvtechRole)) {
        setUser(null);
        return;
      }
      setUser(next);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const permissions = useMemo(() => permissionsForUser(user), [user]);
  const role = user?.role ?? null;
  const isAuthenticated = Boolean(user && getAccessToken() && canAccessAdminPanel(user.curvvtechRole));

  const login = useCallback(async (email: string, password: string) => {
    const { user: next, error } = await loginWithPassword(email, password);
    if (error) return { ok: false, error };
    if (!canAccessAdminPanel(next.curvvtechRole)) {
      await logoutSession();
      return { ok: false, error: "You do not have access to the admin panel." };
    }
    setUser(next);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const ok = await refreshSession();
    if (!ok) {
      setUser(null);
      return false;
    }
    const next = await fetchCurrentUser();
    if (!next || !canAccessAdminPanel(next.curvvtechRole)) {
      await logoutSession();
      setUser(null);
      return false;
    }
    setUser(next);
    return true;
  }, []);

  const hasPermission = useCallback(
    (required: Permission | Permission[], mode: "any" | "all" = "any") =>
      checkPermission(permissions, required, mode),
    [permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      permissions,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refresh,
      hasPermission,
    }),
    [user, role, permissions, isAuthenticated, isLoading, login, logout, refresh, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
