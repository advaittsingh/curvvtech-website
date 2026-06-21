import { Badge } from "@/components/ui/badge";
import type { AdminRole } from "@/types/auth";
import {
  PERMISSION_GROUPS,
  ROLE_META,
  accessLevelBadge,
  moduleAccessLevel,
  permissionsForRoleExport,
  type AccessLevel,
} from "../../roles-schemas";

type Props = {
  role: AdminRole;
  memberCount: number;
};

export function SelectedRolePanel({ role, memberCount }: Props) {
  const meta = ROLE_META[role];
  const permissions = permissionsForRoleExport(role);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{meta.label}</h2>
          <Badge variant="outline" className="text-xs">
            {meta.accessTag}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
        <p className="text-sm mt-2">
          <span className="font-medium tabular-nums">{memberCount}</span>{" "}
          <span className="text-muted-foreground">member{memberCount === 1 ? "" : "s"} · {meta.department}</span>
        </p>
      </div>

      <PermissionMatrix permissions={permissions} />
    </div>
  );
}

function PermissionMatrix({ permissions }: { permissions: ReturnType<typeof permissionsForRoleExport> }) {
  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group.label}</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Module</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Access</th>
                </tr>
              </thead>
              <tbody>
                {group.modules.map((mod) => {
                  const level = moduleAccessLevel(permissions, mod);
                  return (
                    <tr key={mod.id} className="border-t border-border/60">
                      <td className="px-3 py-2">{mod.label}</td>
                      <td className="px-3 py-2">
                        <AccessBadge level={level} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function AccessBadge({ level }: { level: AccessLevel }) {
  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${accessLevelBadge(level)}`}>
      {level}
    </Badge>
  );
}
