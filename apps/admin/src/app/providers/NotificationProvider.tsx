import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { getAccessToken } from "@/lib/session";

export type AppNotification = {
  id: string;
  title: string;
  body?: string;
  type: string;
  href?: string | null;
  read: boolean;
  createdAt: string;
};

type NotificationApiRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  href: string | null;
  created_at: string;
  read: boolean;
};

type NotificationsQueryData = {
  notifications: NotificationApiRow[];
  unread_count: number;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const api = useAdminApi();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => api.notifications.list({ limit: 40 }),
    enabled: Boolean(getAccessToken()),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const notifications = useMemo<AppNotification[]>(
    () =>
      (data?.notifications ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body || undefined,
        type: n.type,
        href: n.href,
        read: n.read,
        createdAt: n.created_at,
      })),
    [data?.notifications],
  );

  const unreadCount = data?.unread_count ?? notifications.filter((n) => !n.read).length;

  const markRead = useCallback(
    (id: string) => {
      qc.setQueryData<NotificationsQueryData>(["admin", "notifications"], (prev) => {
        if (!prev) return prev;
        const next = prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        return {
          notifications: next,
          unread_count: Math.max(0, next.filter((n) => !n.read).length),
        };
      });
      void api.notifications.markRead(id).then(() => refetch());
    },
    [api, qc, refetch],
  );

  const markAllRead = useCallback(() => {
    qc.setQueryData<NotificationsQueryData>(["admin", "notifications"], (prev) => {
      if (!prev) return prev;
      return {
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        unread_count: 0,
      };
    });
    void api.notifications.markAllRead().then(() => refetch());
  }, [api, qc, refetch]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading: isLoading,
      markRead,
      markAllRead,
      refresh: () => void refetch(),
    }),
    [notifications, unreadCount, isLoading, markRead, markAllRead, refetch],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
