import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { chatSocketUrl } from "@/lib/backend-url";

export const CHAT_SOCKET_EVENT = "chat_message";

/** Subscribe to realtime messages for one conversation (joins socket room). */
export function useInboxSocket(conversationId: string | null, onMessage: (msg: unknown) => void) {
  const socketRef = useRef<Socket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!conversationId) return;

    const socket = io(chatSocketUrl(), {
      transports: ["websocket", "polling"],
      query: { conversationId },
    });
    socketRef.current = socket;

    const handler = (msg: unknown) => handlerRef.current(msg);
    socket.on(CHAT_SOCKET_EVENT, handler);

    return () => {
      socket.off(CHAT_SOCKET_EVENT, handler);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId]);
}
