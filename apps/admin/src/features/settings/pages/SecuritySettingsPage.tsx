import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/system";

type Session = {
  id: string;
  user_agent?: string;
  ip_address?: string;
  last_seen_at?: string;
  createdAt?: string;
};

export default function SecuritySettingsPage() {
  const api = useAdminApi();
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin", "company", "sessions"],
    queryFn: () => api.company.sessions(),
  });

  const sessions: Session[] = Array.isArray(data) ? data : [];

  const columns: ColumnDef<Session>[] = [
    {
      id: "agent",
      header: "Device / browser",
      sortValue: (r) => r.user_agent ?? "",
      cell: (r) => <span className="text-sm truncate max-w-[280px] block">{r.user_agent ?? "Unknown"}</span>,
    },
    { id: "ip", header: "IP", sortValue: (r) => r.ip_address ?? "", cell: (r) => r.ip_address ?? "—" },
    {
      id: "last",
      header: "Last seen",
      sortValue: (r) => r.last_seen_at ?? r.createdAt ?? "",
      cell: (r) => {
        const ts = r.last_seen_at ?? r.createdAt;
        return ts ? new Date(ts).toLocaleString() : "—";
      },
    },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Security" description="Two-factor authentication, sessions, and password policy." />
      <BackendErrorAlert error={error} />
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 mt-4">
        <p className="text-sm text-muted-foreground">Session management uses JWT access + refresh tokens.</p>
        <Button variant="outline" disabled>Enable 2FA (coming soon)</Button>
        <div>
          <h3 className="font-medium text-sm mb-3">Active sessions</h3>
          <DataTable columns={columns} data={sessions} isLoading={isLoading} paginated={false} searchable={false} emptyTitle="No sessions recorded" />
        </div>
      </div>
    </div>
  );
}
