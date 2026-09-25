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

/** Admin inbox badge — emitted on every inbound (non-agent) message. */
export const INBOX_ACTIVITY_EVENT = 'inbox_activity' as const

export function emitNewMessage(conversationId: string, message: object) {
  io?.to(`conversation:${conversationId}`).emit(CHAT_SOCKET_EVENT, message)
}

/** Bump unread badges in admin + client portal without waiting for polling. */
export function notifyInboxInbound(opts: {
  conversationId: string
  clientId?: string | null
  sender: string
}) {
  const payload = { conversation_id: opts.conversationId, sender: opts.sender }
  // Admin staff badge — inbound visitor/client/AI messages only.
  if (opts.sender !== 'agent') {
    io?.to('admin:inbox').emit(INBOX_ACTIVITY_EVENT, payload)
  }
  // Client portal badge — team/agent/AI replies only.
  if (opts.clientId && opts.sender !== 'client') {
    io?.to(`client:${opts.clientId}`).emit(INBOX_ACTIVITY_EVENT, payload)
  }
}

/** Client Portal — emit an event to all sockets in a client's room. */
export function emitToClientRoom(clientId: string, event: string, payload: unknown) {
  io?.to(`client:${clientId}`).emit(event, payload)
}

/** Client Portal — emit an event to all sockets watching a project. */
export function emitToProjectRoom(projectId: string, event: string, payload: unknown) {
  io?.to(`project:${projectId}`).emit(event, payload)
}
