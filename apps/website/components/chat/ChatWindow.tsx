'use client'

import { useRef, useEffect, useState } from 'react'
import { X, Send, MessageCircle } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { QuickReplies } from './QuickReplies'
import type { ChatMessage as ChatMessageType, Conversation } from '@/lib/chat-api'

const WELCOME = `Hi 👋 Welcome to Curvvtech.

I'm the Curvvtech assistant.

I can help with:
• Website development
• Mobile apps
• Custom software
• Project quotes

Ask me anything.`

type Props = {
  conversation: Conversation | null
  messages: ChatMessageType[]
  loading: boolean
  onSend: (text: string) => void
  onClose: () => void
  onQuickReply: (text: string) => void
  whatsappTopic?: string
}

export function ChatWindow({
  conversation,
  messages,
  loading,
  onSend,
  onClose,
  onQuickReply,
  whatsappTopic = 'my inquiry'
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const [loadingWa, setLoadingWa] = useState(false)

  const openWhatsApp = async () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank')
      return
    }
    setLoadingWa(true)
    try {
      const { getWhatsAppUrl } = await import('@/lib/chat-api')
      const url = await getWhatsAppUrl(whatsappTopic)
      setWhatsappUrl(url)
      window.open(url, '_blank')
    } catch {
      window.open('https://wa.me/', '_blank')
    } finally {
      setLoadingWa(false)
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const showWelcome = messages.length === 0
  const isEscalated = conversation?.status === 'escalated' || Boolean(conversation?.agent_clerk_id)

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-dark_black">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-dark_black/10 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple_blue text-white">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-dark_black dark:text-white">Curvvtech Support</p>
            <p className="flex items-center gap-1.5 text-xs text-dark_black/60 dark:text-white/60">
              <span className={`h-2 w-2 rounded-full ${isEscalated ? 'bg-amber-500' : 'bg-green-500'}`} />
              {isEscalated ? 'With team' : 'Online'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-dark_black/70 hover:bg-dark_black/5 hover:text-dark_black dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
        {showWelcome && (
          <div className="rounded-2xl bg-dark_black/5 dark:bg-white/5 px-4 py-3 text-sm text-dark_black dark:text-white whitespace-pre-wrap">
            {WELCOME}
          </div>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-dark_black/5 dark:bg-white/5 px-4 py-2 text-sm text-dark_black/60 dark:text-white/60">
              Typing…
            </div>
          </div>
        )}
      </div>

      {/* Quick replies */}
      {messages.length <= 2 && (
        <div className="shrink-0 border-t border-dark_black/10 px-4 py-2 dark:border-white/10">
          <QuickReplies onSelect={onQuickReply} disabled={loading} />
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-dark_black/10 p-3 dark:border-white/10">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const v = inputRef.current?.value?.trim()
            if (v) {
              onSend(v)
              inputRef.current!.value = ''
            }
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message…"
            className="min-w-0 flex-1 rounded-full border border-dark_black/20 dark:border-white/30 bg-dark_black/5 px-4 py-2.5 text-sm text-dark_black dark:text-white placeholder:text-dark_black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple_blue"
            maxLength={2000}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple_blue text-white disabled:opacity-50 hover:opacity-90"
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-2 text-center">
          <button
            type="button"
            onClick={openWhatsApp}
            disabled={loadingWa}
            className="text-xs text-purple_blue hover:underline disabled:opacity-50"
          >
            Continue on WhatsApp →
          </button>
        </p>
      </div>
    </div>
  )
}
