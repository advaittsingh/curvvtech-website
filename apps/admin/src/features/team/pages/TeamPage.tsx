import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader, StatCard } from "@/components/system";
import { DataTable, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Member = { id: string; user_id: string; email?: string; role?: string | null };

const ROLES = ["admin", "manager", "member", "sales", "project_manager", "developer", "designer", "accountant"];

const CAPACITY = [
  { name: "John", pct: 80 },
  { name: "Sarah", pct: 100 },
  { name: "Alex", pct: 40 },
];

export default function TeamPage() {
  const api = useAdminApi();
  const qc = useQueryClient();

  const { data: members, isLoading, error } = useQuery({ queryKey: ["admin", "team", "members"], queryFn: () => api.team.members() });
  const { data: activity } = useQuery({ queryKey: ["admin", "team", "activity"], queryFn: () => api.team.activity(30) });

  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string | null }) => api.team.setMemberRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "team"] }),
  });

  const list: Member[] = Array.isArray(members)
    ? members.map((m: { user_id: string; email?: string; role?: string | null }) => ({ ...m, id: m.user_id }))
    : [];
  const activityList = Array.isArray(activity) ? activity : [];

  const columns: ColumnDef<Member>[] = [
    { id: "email", header: "Member", sortValue: (r) => r.email ?? r.user_id, cell: (r) => <span className="font-medium">{r.email ?? r.user_id}</span> },
    {
      id: "role",
      header: "Role",
      cell: (r) => (
        <Select value={r.role ?? "none"} onValueChange={(v) => setRole.mutate({ userId: r.user_id, role: v === "none" ? null : v })}>
          <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    { id: "dept", header: "Department", cell: () => <Badge variant="outline">Delivery</Badge> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Team" description="Members, roles, and capacity planning." />
      <BackendErrorAlert error={error} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CAPACITY.map((c) => (
          <StatCard key={c.name} title={c.name} value={`${c.pct}%`} trend={c.pct >= 90 ? "At capacity" : "Available"} trendUp={c.pct < 90} />
        ))}
      </div>
      <DataTable columns={columns} data={list} isLoading={isLoading} searchable paginated={false} emptyTitle="No team members" />
      <div className="rounded-lg border border-stone-200 p-4">
        <h3 className="font-medium mb-3">Recent activity</h3>
        <ul className="text-sm space-y-2">
          {activityList.slice(0, 10).map((a: { id: string; action?: string; createdAt?: string }) => (
            <li key={a.id} className="text-stone-600">{a.action} · {a.createdAt && new Date(a.createdAt).toLocaleString()}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
