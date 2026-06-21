import { cn } from "@/lib/utils";
import type { RolesSummary } from "../roles-schemas";

export function RolesCommandHeader({ summary }: { summary: RolesSummary | null | undefined }) {
  const s = summary;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">People</p>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control who can access sales, operations, finance, and content modules.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricPill label="Roles" value={String(s?.role_count ?? 0)} accent="primary" />
        <MetricPill label="Members" value={String(s?.member_count ?? 0)} />
        <MetricPill label="Permissions" value={String(s?.permission_count ?? 0)} />
        <MetricPill label="Departments" value={String(s?.department_count ?? 0)} accent="success" />
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary" | "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-semibold mt-0.5 tabular-nums",
          accent === "primary" && "text-primary",
          accent === "success" && "text-emerald-700",
        )}
      >
        {value}
      </p>
    </div>
  );
}
