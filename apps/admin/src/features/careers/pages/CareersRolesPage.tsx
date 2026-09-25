import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, ChevronRight, Users } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader, EmptyState } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { formatAppliedAt, type CareerRoleSummary } from "../careers.types";

export default function CareersRolesPage() {
  const api = useAdminApi();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "careers", "roles"],
    queryFn: () => api.careers.roles(),
  });

  const roles: CareerRoleSummary[] = data?.roles ?? [];
  const openCount = roles.reduce((sum, role) => sum + role.new_count, 0);
  const shortlistedCount = roles.reduce((sum, role) => sum + (role.shortlisted_count ?? 0), 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Careers"
        description="Applications from curvvtech.com/careers, grouped by role."
      />
      <BackendErrorAlert error={error} />

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Open applications</p>
          <p className="mt-1 text-xl font-semibold">{openCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Shortlisted</p>
          <p className="mt-1 text-xl font-semibold">{shortlistedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Roles</p>
          <p className="mt-1 text-xl font-semibold">{roles.length}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading roles…</p>
      ) : roles.length === 0 ? (
        <EmptyState
          title="No roles yet"
          description="Career openings will appear here as soon as the catalog is loaded."
          icon={<Briefcase className="h-8 w-8" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.slug}
              to={`/careers/${role.slug}`}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-stone-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">{role.title}</p>
                  {role.team ? (
                    <Badge variant="secondary" className="mt-2">
                      {role.team}
                    </Badge>
                  ) : null}
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
              </div>
              <div className="mt-5 flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <strong>{role.new_count}</strong> new
                </span>
                <span className="text-muted-foreground">
                  {role.shortlisted_count ?? 0} shortlisted · {role.rejected_count} rejected
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {role.latest_at ? `Latest ${formatAppliedAt(role.latest_at)}` : "No applications yet"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
