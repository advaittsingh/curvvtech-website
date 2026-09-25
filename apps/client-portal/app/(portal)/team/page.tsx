"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, MessageCircle, CalendarDays, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import {
  Card,
  PageHeader,
  SectionCard,
  Avatar,
  Btn,
  Skeleton,
  Empty,
  relativeTime,
  Breadcrumbs,
} from "@/components/ui";
import { nameFromEmail } from "@/components/project/useProjectWorkspace";

type Member = {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  role_label?: string | null;
  is_manager?: boolean;
};

export default function TeamPage() {
  const { team: wsTeam, primaryProject, loading: wsLoading } = useWorkspace();
  const [portalTeam, setPortalTeam] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ team: Member[] }>("/team")
      .then((r) => setPortalTeam(r.team))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const projectTeam = wsTeam as Member[];
  const loadingAll = wsLoading || loading;

  if (loadingAll) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="cp-animate">
      <Breadcrumbs items={[{ label: "Team" }]} />
      <PageHeader
        title="Your project team"
        subtitle={primaryProject ? `People building ${primaryProject.name}.` : "The Curvvtech team on your account."}
      />

      {projectTeam.length === 0 ? (
        <Empty
          title="Team assignments coming soon"
          hint="Your project manager and developers will appear here once assigned. You'll be able to message them directly from this page."
          icon={Users}
          action={<Btn href="/inbox">Message support</Btn>}
        />
      ) : (
        <div className="space-y-4">
          {projectTeam.map((m) => {
            const displayName = m.name || nameFromEmail(m.email);
            return (
              <Card key={m.id} className="p-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                  <Avatar name={displayName} size={48} online={m.is_manager || undefined} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-lg truncate">{displayName}</div>
                      {m.is_manager && (
                        <span className="shrink-0 rounded-full bg-[var(--info-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--info)]">
                          Project Manager
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--muted)]">{m.role_label || m.role?.replace(/_/g, " ") || "Team member"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`mailto:${m.email}`}>
                      <Btn variant="outline" size="sm"><Mail size={14} /> Email</Btn>
                    </a>
                    <Btn href="/meetings" variant="outline" size="sm"><CalendarDays size={14} /> Schedule</Btn>
                    <Btn href="/inbox" size="sm"><MessageCircle size={14} /> Message</Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {portalTeam.length > 1 && (
        <SectionCard title="Your organisation" className="mt-8">
          <p className="text-sm text-[var(--muted)] mb-4">People from your company with portal access.</p>
          <div className="space-y-3">
            {portalTeam.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar name={m.name ?? nameFromEmail(m.email)} size={36} />
                <div>
                  <div className="text-sm font-medium">{m.name ?? nameFromEmail(m.email)}</div>
                  <div className="text-xs text-[var(--muted)] capitalize">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
