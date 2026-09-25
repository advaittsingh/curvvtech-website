"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace";
import { Skeleton } from "@/components/ui";

/** Legacy route — deliverables now live on each project's Files tab. */
export default function DeliverablesRedirectPage() {
  const router = useRouter();
  const { projects, selectedProjectId, loading } = useWorkspace();

  useEffect(() => {
    if (loading) return;
    const projectId = selectedProjectId ?? projects[0]?.id;
    if (projectId) router.replace(`/projects/${projectId}?tab=Files`);
    else router.replace("/projects");
  }, [loading, selectedProjectId, projects, router]);

  return <Skeleton className="h-64" />;
}
