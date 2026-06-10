'use client'

import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { ChatDialog } from './chat-dialog'

export function FloatingChatButton() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        aria-label="Open live chat"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-purple_blue text-white shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple_blue focus:ring-offset-2 dark:focus:ring-offset-dark_black"
      >
        <MessageCircle className="h-7 w-7" strokeWidth={2} />
      </button>
      <ChatDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
