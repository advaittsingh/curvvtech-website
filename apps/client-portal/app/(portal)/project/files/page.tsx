"use client";

import { Breadcrumbs, PageHeader, Skeleton } from "@/components/ui";
import { ProjectFilesPanel } from "@/components/project/ProjectFilesPanel";
import { useProjectWorkspace } from "@/components/project/useProjectWorkspace";

export default function ProjectFilesPage() {
  const { projectId, project, loading } = useProjectWorkspace();

  if (loading) return <Skeleton className="h-64" />;
  if (!project || !projectId) return null;

  return (
    <div className="cp-animate">
      <Breadcrumbs items={[{ label: "Project", href: "/project" }, { label: "Files" }]} />
      <PageHeader
        title="Project files"
        subtitle="Live links, contracts, designs, deliverables and credentials — all in one place."
      />
      <ProjectFilesPanel projectId={projectId} />
    </div>
  );
}
