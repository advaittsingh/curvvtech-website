import { Navigate, useLocation } from "react-router-dom";
import { isSessionPresent } from "@/lib/session";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!isSessionPresent()) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
