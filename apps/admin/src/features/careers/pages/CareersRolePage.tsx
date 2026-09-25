import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Video } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader, EmptyState } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradientAvatar } from "@/components/crm/GradientAvatar";
import { cn } from "@/lib/utils";
import {
  formatAppliedAt,
  formatInterviewIst,
  pileFromSearch,
  type CareerApplication,
  type CareerPile,
} from "../careers.types";

const PILE_COPY: Record<CareerPile, { emptyTitle: string; emptyDescription: string }> = {
  new: {
    emptyTitle: "No applicants yet",
    emptyDescription: "New applications for this role will show up as cards.",
  },
  shortlisted: {
    emptyTitle: "No one shortlisted yet",
    emptyDescription: "Open an applicant and use Shortlist to email an interview invite.",
  },
  rejected: {
    emptyTitle: "No rejected applications",
    emptyDescription: "Rejected applications stay here for reference.",
  },
};

export default function CareersRolePage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const pile = pileFromSearch(params.get("pile"));
  const api = useAdminApi();

  const rolesQuery = useQuery({
    queryKey: ["admin", "careers", "roles"],
    queryFn: () => api.careers.roles(),
  });
  const role = rolesQuery.data?.roles.find((r) => r.slug === slug);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "careers", "applications", slug, pile],
    queryFn: () => api.careers.list({ role_slug: slug, status: pile }),
    enabled: Boolean(slug),
  });

  const applications: CareerApplication[] = data?.applications ?? [];
  const title = role?.title ?? slug.replace(/-/g, " ");

  function setPile(next: CareerPile) {
    if (next === "new") setParams({});
    else setParams({ pile: next });
  }

  return (
    <div className="p-6">
      <Link
        to="/careers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All roles
      </Link>
      <PageHeader
        title={title}
        description="Open an applicant card to shortlist (email + Meet) or reject with a template."
        action={
          role?.team ? (
            <Badge variant="secondary">{role.team}</Badge>
          ) : undefined
        }
      />
      <BackendErrorAlert error={error} />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button size="sm" variant={pile === "new" ? "default" : "outline"} onClick={() => setPile("new")}>
          Applicants {role ? `(${role.new_count})` : ""}
        </Button>
        <Button
          size="sm"
          variant={pile === "shortlisted" ? "default" : "outline"}
          onClick={() => setPile("shortlisted")}
        >
          Shortlisted {role ? `(${role.shortlisted_count ?? 0})` : ""}
        </Button>
        <Button
          size="sm"
          variant={pile === "rejected" ? "default" : "outline"}
          onClick={() => setPile("rejected")}
        >
          Rejected {role ? `(${role.rejected_count})` : ""}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading applicants…</p>
      ) : applications.length === 0 ? (
        <EmptyState title={PILE_COPY[pile].emptyTitle} description={PILE_COPY[pile].emptyDescription} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {applications.map((app) => (
            <Link
              key={app.id}
              to={`/careers/${slug}/${app.id}${pile === "new" ? "" : `?pile=${pile}`}`}
              className={cn(
                "rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-stone-400 hover:shadow-md",
                pile === "rejected" && "opacity-90",
              )}
            >
              <div className="flex items-start gap-3">
                <GradientAvatar name={app.name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{app.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatAppliedAt(app.created_at)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{app.email}</span>
                </p>
                {app.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {app.phone}
                  </p>
                ) : null}
                {pile === "shortlisted" && app.interview_at ? (
                  <p className="flex items-center gap-2">
                    <Video className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{formatInterviewIst(app.interview_at, app.interview_duration_min)}</span>
                  </p>
                ) : null}
              </div>
              <p className="mt-4 truncate text-xs text-muted-foreground">CV · {app.resume_filename}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
