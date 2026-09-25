"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import {
  PageHeader,
  SectionCard,
  JournalEntry,
  Skeleton,
  Empty,
  Breadcrumbs,
  dayGroupLabel,
  relativeTime,
} from "@/components/ui";

type JournalItem = {
  id: string;
  title: string;
  body?: string | null;
  event_type: string;
  actor_name?: string | null;
  created_at: string;
};

export default function JournalPage() {
  const { primaryProject } = useWorkspace();
  const [entries, setEntries] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = primaryProject ? `?project_id=${primaryProject.id}&limit=100` : "?limit=100";
    api<{ journal: JournalItem[] }>(`/journal${q}`)
      .then((r) => setEntries(r.journal))
      .finally(() => setLoading(false));
  }, [primaryProject?.id]);

  const grouped = entries.reduce<Record<string, JournalItem[]>>((acc, e) => {
    const key = dayGroupLabel(e.created_at);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="cp-animate">
      <Breadcrumbs items={[{ label: "Project", href: "/project" }, { label: "Activity" }]} />
      <PageHeader
        title="Activity feed"
        subtitle="The heartbeat of your project — milestones, files, invoices, approvals, and meetings in one feed."
      />

      {entries.length === 0 ? (
        <Empty
          title="Your journal is warming up"
          hint="As work happens — milestones complete, files upload, invoices generate — everything will be recorded here. No more 'what's happening?' emails."
          icon={BookOpen}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([day, dayEntries]) => (
            <SectionCard key={day} title={day} bodyClassName="px-5 py-1">
              {dayEntries.map((e, i) => (
                <JournalEntry
                  key={e.id}
                  eventType={e.event_type}
                  title={e.title}
                  body={e.body}
                  actorName={e.actor_name}
                  time={relativeTime(e.created_at)}
                  last={i === dayEntries.length - 1}
                />
              ))}
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
