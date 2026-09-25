"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import {
  PageHeader,
  Card,
  Empty,
  Btn,
  Skeleton,
  cn,
  relativeTime,
  dayGroupLabel,
} from "@/components/ui";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  action_json: { route?: string; label?: string };
  read_at: string | null;
  created_at: string;
};

type CatKey = "action" | "updates" | "billing" | "meetings";

/** The notification `type` (set by the backend) already encodes the semantics,
 *  so we can group into client-friendly buckets without any extra API field. */
const CAT_OF: Record<string, CatKey> = {
  approval: "action",
  task: "action",
  invoice: "billing",
  meeting: "meetings",
  message: "updates",
  file: "updates",
  project: "updates",
  update: "updates",
  system: "updates",
};

const CATS: { key: CatKey; label: string; dot: string }[] = [
  { key: "action", label: "Action required", dot: "var(--danger)" },
  { key: "updates", label: "Project updates", dot: "var(--info)" },
  { key: "billing", label: "Billing", dot: "var(--ok)" },
  { key: "meetings", label: "Meetings", dot: "var(--purple)" },
];

function catOf(n: Notification): CatKey {
  return CAT_OF[n.type] ?? "updates";
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CatKey | "all">("all");

  function reload() {
    api<{ notifications: Notification[] }>("/notifications")
      .then((r) => setItems(r.notifications))
      .finally(() => setLoading(false));
  }
  useEffect(reload, []);

  async function markAll() {
    await api("/notifications/mark-read", { method: "POST" });
    reload();
  }

  async function open(n: Notification) {
    await api(`/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    if (n.action_json?.route) router.push(n.action_json.route);
    else reload();
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const n of items) {
      const k = catOf(n);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [items]);

  const visible = filter === "all" ? items : items.filter((n) => catOf(n) === filter);

  const groups = visible.reduce<Record<string, Notification[]>>((acc, n) => {
    const key = dayGroupLabel(n.created_at);
    (acc[key] ??= []).push(n);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Notifications" />
        <Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" />
      </div>
    );
  }

  return (
    <div className="cp-animate">
      <div className="flex items-start justify-between gap-4 mb-5">
        <PageHeader title="Notifications" subtitle="Milestones, invoices, meetings and team updates." />
        {items.some((n) => !n.read_at) && (
          <Btn variant="ghost" onClick={markAll} className="shrink-0 mt-1">Mark all read</Btn>
        )}
      </div>

      {items.length === 0 ? (
        <Empty title="You're all caught up" hint="We'll notify you when something needs your attention." icon={Bell} />
      ) : (
        <>
          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={counts.all} />
            {CATS.map((c) => (
              <FilterChip
                key={c.key}
                active={filter === c.key}
                onClick={() => setFilter(c.key)}
                label={c.label}
                dot={c.dot}
                count={counts[c.key] ?? 0}
              />
            ))}
          </div>

          {visible.length === 0 ? (
            <Empty title="Nothing in this category" hint="Switch to another category to see more updates." icon={Bell} />
          ) : (
            <div className="space-y-6">
              {Object.entries(groups).map(([day, list]) => (
                <div key={day}>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2 px-1">{day}</h2>
                  <div className="space-y-2">
                    {list.map((n) => {
                      const cat = CATS.find((c) => c.key === catOf(n));
                      return (
                        <button key={n.id} onClick={() => open(n)} className="w-full text-left">
                          <Card className={cn("flex items-start gap-3 py-3.5 transition hover:shadow-[var(--shadow-sm)]", !n.read_at ? "bg-[var(--info-bg)]/30" : "opacity-80")}>
                            <span
                              className={cn("h-2.5 w-2.5 rounded-full mt-1 shrink-0", !n.read_at && "cp-live-dot")}
                              style={{ background: cat?.dot ?? "var(--muted-2)" }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm">{n.title}</div>
                              {n.body && <div className="text-sm text-[var(--muted)] mt-0.5">{n.body}</div>}
                              <div className="flex items-center gap-2 text-xs text-[var(--muted-2)] mt-1">
                                {cat && <span>{cat.label}</span>}
                                {cat && <span>·</span>}
                                <span>{relativeTime(n.created_at)}</span>
                              </div>
                            </div>
                          </Card>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  dot,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dot?: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
        active
          ? "border-[var(--brand)] bg-[var(--brand)] text-white"
          : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]",
      )}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: active ? "#fff" : dot }} />}
      {label}
      <span className={cn("tabular-nums text-xs", active ? "text-white/80" : "text-[var(--muted-2)]")}>{count}</span>
    </button>
  );
}
