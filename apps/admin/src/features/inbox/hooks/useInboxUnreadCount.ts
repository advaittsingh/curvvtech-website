import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/app/providers";
import { useAdminApi } from "@/hooks/useAdminApi";
import { hasPermission } from "@/lib/permissions";
import { chatSocketUrl } from "@/lib/backend-url";
import { getAccessToken } from "@/lib/session";

export const INBOX_UNREAD_QUERY_KEY = ["admin", "inbox", "unread-count"] as const;
export const INBOX_ACTIVITY_EVENT = "inbox_activity";

/** Live unread count for sidebar + header inbox badges. */
export function useInboxUnreadCount() {
  const api = useAdminApi();
  const { permissions } = useAuth();
  const canSeeInbox = hasPermission(permissions, "leads.view");

  return useQuery({
    queryKey: INBOX_UNREAD_QUERY_KEY,
    queryFn: async () => {
      const res = await api.chats.unreadCount();
      return res;
    },
    enabled: canSeeInbox,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

/** Invalidate unread badge instantly when a visitor/client sends a message. */
export function useAdminInboxSocket() {
  const qc = useQueryClient();
  const { permissions } = useAuth();
  const canSeeInbox = hasPermission(permissions, "leads.view");

  useEffect(() => {
    if (!canSeeInbox) return;

    const socket: Socket = io(chatSocketUrl(), {
      transports: ["websocket", "polling"],
      auth: { token: getAccessToken() ?? "" },
    });

    const bump = () => {
      void qc.invalidateQueries({ queryKey: INBOX_UNREAD_QUERY_KEY });
    };

    socket.on(INBOX_ACTIVITY_EVENT, bump);

    return () => {
      socket.off(INBOX_ACTIVITY_EVENT, bump);
      socket.disconnect();
    };
  }, [canSeeInbox, qc]);
}

export function inboxUnreadTotal(data?: { unread_messages?: number; unread_conversations?: number }): number {
  const messages = Number(data?.unread_messages ?? 0);
  const conversations = Number(data?.unread_conversations ?? 0);
  return messages > 0 ? messages : conversations;
}
