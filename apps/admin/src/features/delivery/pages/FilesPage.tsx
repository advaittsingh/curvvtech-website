import { PageHeader, EmptyState } from "@/components/system";

export default function FilesPage() {
  return (
    <div className="p-6">
      <PageHeader title="Files" description="Shared delivery assets across projects." />
      <EmptyState title="No files" description="Upload project deliverables and client documents here." />
    </div>
  );
}
