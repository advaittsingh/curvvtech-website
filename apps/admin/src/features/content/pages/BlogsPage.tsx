import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { DataTable, PageHeader, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Blog = { id: string; title?: string; slug?: string; status?: string; createdAt?: string };

const columns: ColumnDef<Blog>[] = [
  { id: "title", header: "Title", sortValue: (r) => r.title ?? "", cell: (r) => <span className="font-medium">{r.title ?? "—"}</span> },
  { id: "slug", header: "Slug", sortValue: (r) => r.slug ?? "", cell: (r) => r.slug ?? "—" },
  { id: "status", header: "Status", sortValue: (r) => r.status ?? "", cell: (r) => <Badge variant="secondary">{r.status ?? "draft"}</Badge> },
];

export default function BlogsPage() {
  const api = useAdminApi();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "blogs"], queryFn: () => api.blogs.list() });
  const list: Blog[] = Array.isArray(data) ? data : [];

  return (
    <div className="p-6">
      <PageHeader title="Blogs" description="CRUD, categories, tags, and SEO." action={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New post</Button>} />
      <BackendErrorAlert error={error} />
      <DataTable columns={columns} data={list} isLoading={isLoading} exportable exportFileName="blogs.csv" emptyTitle="No blog posts" />
    </div>
  );
}
