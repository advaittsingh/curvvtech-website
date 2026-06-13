import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/permissions";
import type { AdminRole } from "@/types/auth";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  sales: "Sales",
  project_manager: "Project Manager",
  developer: "Developer",
  designer: "Designer",
  accountant: "Accountant",
};

export default function RolesPage() {
  const api = useAdminApi();
  const { data: roles } = useQuery({ queryKey: ["admin", "team", "roles"], queryFn: () => api.team.roles() });
  const dbRoles = Array.isArray(roles) ? roles : [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Roles & permissions" description="RBAC matrix for CurvvTech OS." />
      <div className="rounded-lg border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="text-left p-3 font-medium">Role</th>
              {ALL_PERMISSIONS.map((p) => (
                <th key={p} className="p-2 text-[10px] font-normal text-stone-500 writing-mode-vertical">{p.replace(".", " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(ROLE_PERMISSIONS) as AdminRole[]).map((role) => (
              <tr key={role} className="border-t border-stone-100">
                <td className="p-3 font-medium whitespace-nowrap">{ROLE_LABELS[role]}</td>
                {ALL_PERMISSIONS.map((perm) => (
                  <td key={perm} className="p-2 text-center">
                    {ROLE_PERMISSIONS[role].includes(perm) ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">✓</Badge> : <span className="text-stone-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dbRoles.length > 0 && (
        <div className="text-sm text-stone-600">
          <p className="font-medium mb-2">Database roles table</p>
          <pre className="bg-stone-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(dbRoles, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
