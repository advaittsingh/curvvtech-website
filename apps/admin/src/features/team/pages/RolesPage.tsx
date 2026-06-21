import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import type { AdminRole } from "@/types/auth";
import type { RolesDashboard } from "../roles-schemas";
import { RolesCommandHeader } from "../components/roles/RolesCommandHeader";
import { RoleCardsGrid } from "../components/roles/RoleCardsGrid";
import { SelectedRolePanel } from "../components/roles/SelectedRolePanel";
import { RolesSecurityPanel } from "../components/roles/RolesSecurityPanel";

export default function RolesPage() {
  const api = useAdminApi();
  const [selected, setSelected] = useState<AdminRole>("admin");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "team", "roles", "dashboard"],
    queryFn: () => api.team.rolesDashboard() as Promise<RolesDashboard>,
  });

  const roles = data?.roles ?? [];
  const selectedRole = roles.find((r) => r.role === selected) ?? roles[0];
  const activeRole = selectedRole?.role ?? selected;

  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.role === selected)) {
      setSelected(roles[0]!.role);
    }
  }, [roles, selected]);

  return (
    <div className="p-6 space-y-6">
      <RolesCommandHeader summary={data?.summary} />
      {error && <BackendErrorAlert error={error as Error} />}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading roles…</p>
      ) : roles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-base font-semibold">No team members yet</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Invite employees, assign roles, track workload, and manage payroll. Role cards will populate as your team grows.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6 min-w-0">
            <RoleCardsGrid roles={roles} selected={activeRole} onSelect={setSelected} />
            {selectedRole && (
              <SelectedRolePanel role={activeRole} memberCount={selectedRole.member_count} />
            )}
          </div>
          <RolesSecurityPanel insight={data?.ai_insight} />
        </div>
      )}
    </div>
  );
}
