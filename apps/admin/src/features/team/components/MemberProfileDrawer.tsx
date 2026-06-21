import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeamMember, TeamMemberDetail } from "../team-schemas";
import { ROLE_META, TEAM_ROLES, departmentLabel, formatInr, formatShortDate, roleLabel } from "../team-schemas";

type Props = {
  member: TeamMember | null;
  detail: TeamMemberDetail | null | undefined;
  loading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleChange: (userId: string, role: string | null) => void;
};

export function MemberProfileDrawer({
  member,
  detail,
  loading,
  open,
  onOpenChange,
  onRoleChange,
}: Props) {
  const m = detail ?? member;
  if (!m) return null;

  const roleMeta = ROLE_META[m.role ?? ""] ?? ROLE_META.member!;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{m.name}</SheetTitle>
          <SheetDescription>{m.role_title ?? roleLabel(m.role)}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={roleMeta.badge}>
              {roleLabel(m.role)}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {departmentLabel(m.department)}
            </Badge>
            <Badge variant="secondary">{m.workload} workload</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium break-all">{m.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{m.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active tasks</p>
              <p className="font-medium tabular-nums">{m.active_tasks}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completion rate</p>
              <p className="font-medium tabular-nums">{m.completion_rate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Projects</p>
              <p className="font-medium tabular-nums">{m.project_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Utilization</p>
              <p className="font-medium tabular-nums">{m.utilization_pct}%</p>
            </div>
            {m.monthly_salary_cents != null && m.monthly_salary_cents > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Salary</p>
                <p className="font-medium tabular-nums">{formatInr(m.monthly_salary_cents)}</p>
              </div>
            )}
            {m.joined_at && (
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="font-medium">{formatShortDate(m.joined_at)}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Role</p>
            <Select
              value={m.role ?? "none"}
              onValueChange={(v) => onRoleChange(m.user_id, v === "none" ? null : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No role</SelectItem>
                {TEAM_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading profile…</p>
          ) : (
            <>
              {detail?.projects && detail.projects.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Projects</p>
                  <div className="space-y-1.5">
                    {detail.projects.map((p) => (
                      <Link
                        key={p.id}
                        to={`/projects/${p.id}`}
                        className="block text-sm rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/40"
                      >
                        {p.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {detail?.tasks && detail.tasks.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Tasks</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {detail.tasks.map((t) => (
                      <div key={t.id} className="text-sm rounded-lg border border-border/60 px-3 py-2">
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {t.status}
                          {t.project_name ? ` · ${t.project_name}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail?.activity && detail.activity.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Recent activity</p>
                  <ul className="text-sm space-y-2">
                    {detail.activity.slice(0, 6).map((a) => (
                      <li key={a.id} className="text-muted-foreground">
                        {a.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
