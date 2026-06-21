import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader, DataTable, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";

type Chat = { id: string; visitor_name?: string; status?: string; started_at?: string; message_count?: number };

const columns: ColumnDef<Chat>[] = [
  { id: "visitor", header: "Visitor", sortValue: (r) => r.visitor_name ?? "", cell: (r) => r.visitor_name ?? "Guest" },
  { id: "status", header: "Status", sortValue: (r) => r.status ?? "", cell: (r) => <Badge variant="secondary">{r.status ?? "open"}</Badge> },
  { id: "started", header: "Started", sortValue: (r) => r.started_at ?? "", cell: (r) => r.started_at ? new Date(r.started_at).toLocaleString() : "—" },
  { id: "msgs", header: "Messages", sortValue: (r) => r.message_count ?? 0, cell: (r) => r.message_count ?? 0 },
];

export default function ChatConversationsPage() {
  const api = useAdminApi();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "chats"], queryFn: () => api.chats.list() });
  const list: Chat[] = Array.isArray(data) ? data : [];

  return (
    <div className="p-6">
      <PageHeader title="Conversations" description="Website chat sessions and visitor messages." />
      <BackendErrorAlert error={error} />
      <DataTable columns={columns} data={list} isLoading={isLoading} emptyTitle="No conversations yet" />
    </div>
  );
}
