import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TeamMember } from "../team-schemas";
import { ROLE_META, departmentLabel, roleLabel, workloadColor } from "../team-schemas";

type Props = {
  members: TeamMember[];
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (member: TeamMember) => void;
  isLoading?: boolean;
};

export function TeamMembersTable({ members, search, onSearchChange, onSelect, isLoading }: Props) {
  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${m.name} ${m.email} ${m.role} ${m.department} ${m.role_title}`.toLowerCase().includes(q);
  });

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading team…</div>;
  }

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
        <p className="text-base font-semibold">No team members yet</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Invite employees, assign roles, track workload, and manage payroll from one place.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <p className="text-sm font-semibold">Team members</p>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search team members, roles, departments…"
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Member</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium hidden md:table-cell">Department</th>
              <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Projects</th>
              <th className="px-4 py-2.5 font-medium">Tasks</th>
              <th className="px-4 py-2.5 font-medium">Utilization</th>
              <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const roleMeta = ROLE_META[m.role ?? ""] ?? ROLE_META.member!;
              return (
                <tr
                  key={m.user_id}
                  className="border-b border-border/60 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => onSelect(m)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role_title ?? m.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-[10px] font-medium", roleMeta.badge)}>
                      {roleLabel(m.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell capitalize text-muted-foreground">
                    {departmentLabel(m.department)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell tabular-nums">{m.project_count}</td>
                  <td className="px-4 py-3 tabular-nums">{m.active_tasks}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold tabular-nums">{m.utilization_pct}%</span>
                    <p className={cn("text-[10px]", workloadColor(m.workload))}>{m.workload}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {m.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
