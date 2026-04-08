import type { Server as SocketServer } from 'socket.io'

let io: SocketServer | null = null

export function setChatSocket(server: SocketServer) {
  io = server
}

export function getChatSocket(): SocketServer | null {
  return io
}

/** Custom event name (avoid `message`, which overlaps Engine.IO packet types in some clients). */
export const CHAT_SOCKET_EVENT = 'chat_message' as const

export function emitNewMessage(conversationId: string, message: object) {
  io?.to(`conversation:${conversationId}`).emit(CHAT_SOCKET_EVENT, message)
}
