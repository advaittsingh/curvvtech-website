'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { io } from 'socket.io-client'
import { MessageCircle } from 'lucide-react'
import {
  createConversation,
  getConversation,
  sendMessage,
  getChatSocketUrl,
  type Conversation,
  type ChatMessage
} from '@/lib/chat-api'

const ChatWindow = dynamic(
  () => import('./ChatWindow').then((m) => ({ default: m.ChatWindow })),
  { ssr: false, loading: () => <div className="flex h-[85vh] w-96 items-center justify-center rounded-2xl bg-white dark:bg-dark_black">Loading chat…</div> }
)

function parseSocketChatMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = o.id
  const conversation_id = o.conversation_id
  const sender = o.sender
  const message = o.message
  if (
    typeof id !== 'string' ||
    typeof conversation_id !== 'string' ||
    typeof sender !== 'string' ||
    typeof message !== 'string'
  ) {
    return null
  }
  if (sender !== 'ai' && sender !== 'user' && sender !== 'agent') return null
  const agent_clerk_id =
    o.agent_clerk_id === null || typeof o.agent_clerk_id === 'string' ? o.agent_clerk_id : null
  let createdAt: string
  if (typeof o.createdAt === 'string') createdAt = o.createdAt
  else if (o.createdAt instanceof Date) createdAt = o.createdAt.toISOString()
  else createdAt = String(o.createdAt ?? '')
  return { id, conversation_id, sender, message, agent_clerk_id, createdAt }
}

function getVisitorId(): string {
  if (typeof window === 'undefined') return 'anonymous'
  let id = sessionStorage.getItem('curvv_chat_visitor_id')
  if (!id) {
    id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    sessionStorage.setItem('curvv_chat_visitor_id', id)
  }
  return id
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const loadOrCreateConversation = useCallback(async () => {
    const convId = typeof window !== 'undefined' ? sessionStorage.getItem('curvv_chat_conversation_id') : null
    if (convId) {
      try {
        const data = await getConversation(convId)
        setConversation(data)
        setMessages(data.messages ?? [])
        return data.id
      } catch {
        sessionStorage.removeItem('curvv_chat_conversation_id')
      }
    }
    const visitor_id = getVisitorId()
    const pages = typeof window !== 'undefined' ? [window.location.pathname] : []
    const conv = await createConversation({ visitor_id, pages_visited: pages })
    setConversation(conv)
    setMessages([])
    if (typeof window !== 'undefined') sessionStorage.setItem('curvv_chat_conversation_id', conv.id)
    return conv.id
  }, [])

  useEffect(() => {
    if (!open) return
    loadOrCreateConversation().catch(console.error)
  }, [open, loadOrCreateConversation])

  useEffect(() => {
    if (!open || !conversation?.id) return
    const base = getChatSocketUrl()
    if (!base) return

    const socket = io(base, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      query: { conversationId: conversation.id },
    })

    const onMessage = (raw: unknown) => {
      const msg = parseSocketChatMessage(raw)
      if (!msg || msg.conversation_id !== conversation.id) return
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
    }

    socket.on('chat_message', onMessage)
    return () => {
      socket.off('chat_message', onMessage)
      socket.disconnect()
    }
  }, [open, conversation?.id])

  const handleSend = useCallback(
    async (text: string) => {
      if (!conversation || loading) return
      setLoading(true)
      try {
        const result = await sendMessage(conversation.id, text)
        setMessages(result.messages)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    },
    [conversation, loading]
  )

  const handleQuickReply = useCallback(
    (text: string) => {
      handleSend(text)
    },
    [handleSend]
  )

  const handleClose = useCallback(async () => {
    setOpen(false)
  }, [])

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Curvvtech"
          className="flex shrink-0 items-center gap-2 rounded-full bg-purple_blue px-5 py-3 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple_blue focus:ring-offset-2 dark:focus:ring-offset-dark_black"
        >
          <MessageCircle className="h-6 w-6 shrink-0" strokeWidth={2} />
          <span className="font-medium">Chat with Curvvtech</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-1100 w-[calc(100vw-2rem)] max-w-[420px] h-[min(560px,85vh)] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-dark_black/10 dark:border-white/10 transition-all duration-200">
          <ChatWindow
            conversation={conversation}
            messages={messages}
            loading={loading}
            onSend={handleSend}
            onClose={handleClose}
            onQuickReply={handleQuickReply}
            whatsappTopic={messages.length ? messages[messages.length - 1]?.message?.slice(0, 80) || 'my inquiry' : 'my inquiry'}
          />
        </div>
      )}
    </>
  )
}
