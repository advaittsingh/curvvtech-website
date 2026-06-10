import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/session";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { UserPlus } from "lucide-react";

export default function Team() {
  const { data: members, isLoading: membersLoading, error: membersError } = useQuery({
    queryKey: ["admin", "team", "members"],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).team.members();
    },
  });
  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin", "team", "activity"],
    queryFn: async () => {
      const token = getAccessToken();
      return adminApi(token).team.activity(20);
    },
  });

  const memberList = Array.isArray(members) ? members : [];
  const activityList = Array.isArray(activity) ? activity : [];
  const apiError = members && typeof members === "object" && "error" in members ? (members as { error: string }).error : null;

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Team</h2>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite member
        </Button>
      </div>

      <Card className="border-stone-200">
        <CardHeader className="border-b border-stone-200">
          <CardTitle className="text-base">Team members & roles</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {membersLoading && <p className="text-stone-500">Loading…</p>}
          <BackendErrorAlert error={membersError} />
          {membersError && <p className="text-red-600">Failed to load members.</p>}
          {apiError && <p className="text-red-600">{apiError}</p>}
          {!membersLoading && !membersError && !apiError && (
            memberList.length === 0 ? (
              <p className="text-stone-500">No users in the database yet. Sign up via the API, then set curvvtech_role in Postgres.</p>
            ) : (
              <ul className="space-y-2">
                {memberList.map((m: { user_id: string; email?: string; role?: string | null }) => (
                  <li key={m.user_id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                    <span className="font-medium text-stone-800">{m.email ?? m.user_id}</span>
                    <Badge variant="secondary">{m.role ?? "—"}</Badge>
                  </li>
                ))}
              </ul>
            )
          )}
        </CardContent>
      </Card>

      <Card className="border-stone-200">
        <CardHeader className="border-b border-stone-200">
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {activityLoading && <p className="text-stone-500">Loading…</p>}
          {!activityLoading && (activityList.length === 0 ? (
            <p className="text-stone-500">No activity yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activityList.map((a: { id: string; action?: string; entity_type?: string; entity_id?: string; createdAt?: string }) => (
                <li key={a.id} className="text-stone-600">
                  <span className="font-medium text-stone-700">{a.action}</span>
                  {a.entity_type && <span> · {a.entity_type}</span>}
                  {a.createdAt && <span className="text-stone-400 ml-1">{new Date(a.createdAt).toLocaleDateString()}</span>}
                </li>
              ))}
            </ul>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
