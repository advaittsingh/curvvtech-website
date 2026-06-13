import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import type { Permission } from "@/types/auth";

type ProtectedRouteProps = {
  children: React.ReactNode;
  /** Single permission or list (any match by default). */
  permission?: Permission | Permission[];
  /** When multiple permissions are passed, require all instead of any. */
  requireAll?: boolean;
};

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <p className="text-sm text-stone-600">Validating session…</p>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-xl font-semibold text-stone-900">Access denied</h1>
        <p className="text-sm text-stone-600">
          Your account is signed in but does not have permission to view this page.
        </p>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  permission,
  requireAll = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoading />;

  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission, requireAll ? "all" : "any")) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
