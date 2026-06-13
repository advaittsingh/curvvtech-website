import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AppNotification = {
  id: string;
  title: string;
  body?: string;
  type: "invoice_paid" | "proposal_approved" | "lead_assigned" | "project_delayed" | "info";
  read: boolean;
  createdAt: string;
};

const SAMPLE: AppNotification[] = [
  {
    id: "1",
    title: "Invoice Paid",
    body: "INV-1042 marked paid by client",
    type: "invoice_paid",
    read: false,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: "2",
    title: "Proposal Approved",
    body: "Acme Corp approved website redesign proposal",
    type: "proposal_approved",
    read: false,
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
  },
  {
    id: "3",
    title: "Lead Assigned",
    body: "New lead from website assigned to you",
    type: "lead_assigned",
    read: true,
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
  },
  {
    id: "4",
    title: "Project Delayed",
    body: "Mobile app sprint slipped 3 days",
    type: "project_delayed",
    read: true,
    createdAt: new Date(Date.now() - 172800_000).toISOString(),
  },
];

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  push: (n: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(SAMPLE);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const push = useCallback((n: Omit<AppNotification, "id" | "read" | "createdAt">) => {
    setNotifications((prev) => [
      {
        ...n,
        id: crypto.randomUUID(),
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo(
    () => ({ notifications, unreadCount, markRead, markAllRead, push }),
    [notifications, unreadCount, markRead, markAllRead, push],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
