import type { TeamDepartment } from "../team-schemas";
import { departmentLabel } from "../team-schemas";

export function DepartmentCards({ departments }: { departments: TeamDepartment[] }) {
  if (departments.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {departments.map((d) => (
        <div key={d.department} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold capitalize">{departmentLabel(d.department)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {d.member_count} member{d.member_count === 1 ? "" : "s"} · {d.open_tasks} open task{d.open_tasks === 1 ? "" : "s"}
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(d.open_tasks * 3, 8))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
