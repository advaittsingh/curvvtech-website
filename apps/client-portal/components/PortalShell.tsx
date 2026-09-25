"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  MessagesSquare,
  CheckSquare,
  CalendarDays,
  Bell,
  LogOut,
  Menu,
  X,
  MessageCircle,
  MessageSquare,
  Users,
} from "lucide-react";
import { api, API_BASE, fetchBranding, getSession, logout, type Branding, type PortalUser } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Avatar, Btn, relativeTime, cn } from "@/components/ui";

type NavLink = { href: string; label: string; icon: typeof LayoutDashboard };

function buildNav(): NavLink[] {
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "All projects", icon: FolderKanban },
    { href: "/billing", label: "Billing", icon: Receipt },
    { href: "/approvals", label: "Approvals", icon: CheckSquare },
    { href: "/inbox", label: "Inbox", icon: MessagesSquare },
    { href: "/meetings", label: "Meetings", icon: CalendarDays },
    { href: "/team", label: "Team", icon: Users },
  ];
}

function isActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  if (base === "/project") return pathname === "/project" || pathname.startsWith("/projects/");
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedProject, projects, setSelectedProjectId, taskProgressFor, lastSyncedAt } = useWorkspace();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [brand, setBrand] = useState<Branding["branding"]>({ company_name: "Portal", brand_color: "#111111" });
  const [unread, setUnread] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const nav = buildNav();

  const refreshBadges = () => {
    api<{ unread_count: number }>("/notifications?unread=true")
      .then((r) => setUnread(r.unread_count))
      .catch(() => {});
    if (!pathname.startsWith("/inbox")) {
      api<{ unread_messages: number }>("/inbox/unread-count")
        .then((r) => setUnreadMsgs(r.unread_messages))
        .catch(() => {});
    }
  };

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setUser(s.user);
    setReady(true);
    fetchBranding().then((b) => setBrand(b.branding)).catch(() => {});

    refreshBadges();
    const t = setInterval(refreshBadges, 15_000);

    const socket = io(API_BASE, {
      auth: { token: s.accessToken },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("inbox_activity", () => refreshBadges());

    return () => {
      clearInterval(t);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [router]);

  // Clear the message badge as soon as the client opens the inbox.
  useEffect(() => {
    if (pathname.startsWith("/inbox")) {
      setUnreadMsgs(0);
    } else {
      refreshBadges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on route change only
  }, [pathname]);

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[var(--border)] border-t-[var(--brand)] animate-spin" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  const accent = brand.brand_color ?? "#111111";
  const displayName = user?.name || user?.email || "Client";

  return (
    <div className="h-dvh overflow-hidden flex" style={{ ["--brand" as string]: accent }}>
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[var(--panel)] border-r border-[var(--border)] flex flex-col transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center px-5 border-b border-[var(--border)] shrink-0">
          {brand.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo_url} alt="logo" className="h-8 max-w-[160px] object-contain" />
          ) : (
            <span className="font-bold text-lg tracking-tight">{brand.company_name ?? "Portal"}</span>
          )}
        </div>

        {projects.length > 0 && (
          <div className="mx-3 mt-3 space-y-2">
            <div className="px-1 text-[10px] uppercase tracking-wide text-[var(--muted)] font-semibold">
              {projects.length === 1 ? "Your project" : `Your projects (${projects.length})`}
            </div>
            {projects.map((p) => {
              const active = selectedProject?.id === p.id;
              const tp = taskProgressFor(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl border transition",
                    active
                      ? "border-[var(--brand)] bg-[var(--brand)]/8"
                      : "border-[var(--border)] bg-black/[0.02] hover:bg-black/[0.04]",
                  )}
                >
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{p.progress_pct}% complete</div>
                  {tp && tp.total > 0 && (
                    <div className="text-[10px] text-[var(--muted)] mt-1">
                      {tp.done}/{tp.total} tasks done
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const msgBadge = item.href === "/inbox" ? unreadMsgs : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition",
                  active ? "text-white shadow-[var(--shadow-sm)]" : "text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--text)]",
                )}
                style={active ? { background: accent } : {}}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {msgBadge > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                      active ? "bg-white/20 text-white" : "bg-[var(--danger)] text-white",
                    )}
                  >
                    {msgBadge > 9 ? "9+" : msgBadge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--border)] shrink-0 space-y-2">
          <Btn href="/inbox" variant="outline" className="w-full text-sm">
            <MessageCircle size={16} /> Message your team
          </Btn>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 h-dvh">
        <header className="h-16 shrink-0 flex items-center justify-between px-4 lg:px-8 border-b border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-sm z-20">
          <button className="lg:hidden p-1" onClick={() => setOpen((o) => !o)} aria-label="menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--muted)]">
            {selectedProject && (
              <>
                <FolderKanban size={14} />
                <span className="font-medium text-[var(--text)]">{selectedProject.name}</span>
              </>
            )}
            {lastSyncedAt && (
              <span
                className="flex items-center gap-1.5 cursor-default"
                title="Last synchronized with Curvvtech servers"
              >
                <span className="text-[var(--muted-2)]">·</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)] cp-live-dot" />
                <span>Synced {relativeTime(lastSyncedAt)}</span>
              </span>
            )}
          </div>

          <div className="flex-1 sm:flex-none" />
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/inbox" className="relative p-1.5 rounded-lg hover:bg-black/[0.04]" aria-label="messages">
              <MessageSquare size={20} className="text-[var(--muted)]" />
              {unreadMsgs > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[var(--danger)] text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-semibold">
                  {unreadMsgs > 9 ? "9+" : unreadMsgs}
                </span>
              )}
            </Link>
            <Link href="/notifications" className="relative p-1.5 rounded-lg hover:bg-black/[0.04]" aria-label="notifications">
              <Bell size={20} className="text-[var(--muted)]" />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[var(--danger)] text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-semibold">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2.5">
              <Avatar name={displayName} size={34} />
              <div className="hidden sm:block">
                <div className="text-sm font-medium leading-tight max-w-[140px] truncate">{displayName}</div>
                <div className="text-xs text-[var(--muted)] capitalize">{user?.role}</div>
              </div>
            </div>
            <button onClick={onLogout} className="text-[var(--muted)] hover:text-[var(--text)] p-1.5 rounded-lg hover:bg-black/[0.04]" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
