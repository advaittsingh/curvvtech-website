"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Video, FileText, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import {
  PageHeader,
  SectionCard,
  Badge,
  Empty,
  Btn,
  Skeleton,
} from "@/components/ui";

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  meet_url: string | null;
  recording_url: string | null;
  notes: string | null;
  status: string;
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ meetings: Meeting[] }>("/meetings")
      .then((r) => setMeetings(r.meetings))
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.starts_at).getTime() >= now && m.status !== "cancelled");
  const past = meetings.filter((m) => new Date(m.starts_at).getTime() < now || m.status === "completed");

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Meetings" />
        <Skeleton className="h-28" /><Skeleton className="h-28" />
      </div>
    );
  }

  return (
    <div className="cp-animate">
      <PageHeader title="Meetings" subtitle="Upcoming calls, recordings and meeting notes." />

      {meetings.length === 0 ? (
        <Empty title="No meetings scheduled" hint="When your team books a call, you'll see the Google Meet link here." icon={CalendarDays} />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <SectionCard title="Upcoming" icon={CalendarDays} bodyClassName="space-y-4">
              {upcoming.map((m) => (
                <MeetingCard key={m.id} m={m} upcoming />
              ))}
            </SectionCard>
          )}
          {past.length > 0 && (
            <SectionCard title="Past meetings" icon={Video} bodyClassName="space-y-4">
              {past.map((m) => (
                <MeetingCard key={m.id} m={m} />
              ))}
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingCard({ m, upcoming }: { m: Meeting; upcoming?: boolean }) {
  const start = new Date(m.starts_at);
  const day = start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const time = start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--panel-2)]">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className={`h-14 w-14 rounded-xl flex flex-col items-center justify-center shrink-0 text-center ${upcoming ? "bg-[var(--info-bg)] text-[var(--info)]" : "bg-black/[0.04] text-[var(--muted)]"}`}>
          <div className="text-xs font-bold uppercase leading-none">{start.toLocaleDateString("en-IN", { month: "short" })}</div>
          <div className="text-lg font-bold leading-none">{start.getDate()}</div>
        </div>
        <div className="min-w-0">
          <div className="font-semibold">{m.title}</div>
          <div className="text-sm text-[var(--muted)]">{day} · {time}</div>
          {m.description && <div className="text-sm text-[var(--muted)] mt-1 line-clamp-2">{m.description}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge status={m.status} />
        {upcoming && m.meet_url && (
          <a href={m.meet_url} target="_blank" rel="noreferrer">
            <Btn><ExternalLink size={14} /> Join</Btn>
          </a>
        )}
        {!upcoming && m.recording_url && (
          <a href={m.recording_url} target="_blank" rel="noreferrer">
            <Btn variant="outline"><Video size={14} /> Recording</Btn>
          </a>
        )}
      </div>
      {m.notes && (
        <div className="sm:col-span-full text-sm text-[var(--muted)] border-t border-[var(--border)] pt-3 flex gap-2">
          <FileText size={15} className="shrink-0 mt-0.5" />
          <span>{m.notes}</span>
        </div>
      )}
    </div>
  );
}
