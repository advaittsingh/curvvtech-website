'use client'

import type { ChatMessage as ChatMessageType } from '@/lib/chat-api'

type Props = {
  message: ChatMessageType
}

export function ChatMessage({ message }: Props) {
  const isUser = message.sender === 'user'
  const isAgent = message.sender === 'agent'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-purple_blue text-white'
            : isAgent
              ? 'bg-dark_black/10 dark:bg-white/10 text-dark_black dark:text-white'
              : 'bg-dark_black/5 dark:bg-white/5 text-dark_black dark:text-white'
        }`}
      >
        {isAgent && (
          <p className="mb-1 text-xs font-medium text-purple_blue">Curvvtech Team</p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.message}</p>
      </div>
    </div>
  )
}
