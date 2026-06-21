import { useAuth } from "@/app/providers";
import type { Permission } from "@/types/auth";

function Forbidden() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          Your account is signed in but does not have permission to view this page.
        </p>
      </div>
    </div>
  );
}

export function RequirePermission({
  permission,
  children,
}: {
  permission?: Permission | Permission[];
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();

  if (permission && !hasPermission(permission)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
