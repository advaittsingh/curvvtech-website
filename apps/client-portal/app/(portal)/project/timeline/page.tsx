"use client";

import {
  Breadcrumbs,
  PageHeader,
  SectionCard,
  Skeleton,
  Empty,
  TimelineItem,
  dayGroupLabel,
  formatDateTime,
} from "@/components/ui";
import { useProjectWorkspace } from "@/components/project/useProjectWorkspace";

export default function ProjectTimelinePage() {
  const { project, timeline, loading } = useProjectWorkspace();

  if (loading) return <Skeleton className="h-64" />;
  if (!project) return null;

  const grouped = timeline.reduce<Record<string, typeof timeline>>((acc, e) => {
    const key = dayGroupLabel(e.created_at);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="cp-animate">
      <Breadcrumbs items={[{ label: "Project", href: "/project" }, { label: "Timeline" }]} />
      <PageHeader
        title="Project timeline"
        subtitle="Every update your team publishes — deployments, approvals, files, and milestones."
      />

      {timeline.length === 0 ? (
        <Empty
          title="No updates published yet"
          hint="Your team hasn't shared progress here yet. When they publish milestones, uploads, or deployments, they'll appear automatically — like a GitHub activity feed."
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([day, events]) => (
            <SectionCard key={day} title={day}>
              {events.map((e, i) => (
                <TimelineItem
                  key={e.id}
                  eventType={e.event_type}
                  title={e.title}
                  body={e.body}
                  actorName={e.actor_name}
                  time={formatDateTime(e.created_at)}
                  last={i === events.length - 1}
                />
              ))}
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
