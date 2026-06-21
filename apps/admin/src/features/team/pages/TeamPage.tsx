import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { TeamCommandHeader } from "../components/TeamCommandHeader";
import { TeamIntelligencePanel } from "../components/TeamIntelligencePanel";
import { DepartmentCards } from "../components/DepartmentCards";
import { TeamMembersTable } from "../components/TeamMembersTable";
import { WorkloadPanel, TeamActivityFeed, HiringTracker } from "../components/TeamSidePanels";
import { MemberProfileDrawer } from "../components/MemberProfileDrawer";
import type { TeamDashboard, TeamMember, TeamMemberDetail } from "../team-schemas";

export default function TeamPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "team", "dashboard"],
    queryFn: () => api.team.dashboard() as Promise<TeamDashboard>,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "team", "member", selected?.user_id],
    queryFn: () => api.team.member(selected!.user_id) as Promise<TeamMemberDetail>,
    enabled: Boolean(selected?.user_id && drawerOpen),
  });

  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string | null }) =>
      api.team.setMemberRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "team"] });
    },
  });

  function openMember(member: TeamMember) {
    setSelected(member);
    setDrawerOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      <TeamCommandHeader summary={data?.summary} />
      {error && <BackendErrorAlert error={error as Error} />}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6 min-w-0">
          <DepartmentCards departments={data?.departments ?? []} />
          <TeamMembersTable
            members={data?.members ?? []}
            search={search}
            onSearchChange={setSearch}
            onSelect={openMember}
            isLoading={isLoading}
          />
          <WorkloadPanel workload={data?.workload ?? []} />
          <TeamActivityFeed activity={data?.activity ?? []} />
        </div>

        <div className="space-y-4">
          <TeamIntelligencePanel insight={data?.ai_insight} />
          <HiringTracker positions={data?.open_positions ?? []} />
        </div>
      </div>

      <MemberProfileDrawer
        member={selected}
        detail={detail}
        loading={detailLoading}
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setSelected(null);
        }}
        onRoleChange={(userId, role) => setRole.mutate({ userId, role })}
      />
    </div>
  );
}
