import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/providers";
import type { Permission } from "@/types/auth";

export function RequirePermission({
  permission,
  children,
}: {
  permission?: Permission | Permission[];
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
