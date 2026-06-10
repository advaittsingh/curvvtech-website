'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

type ChatDialogProps = {
  open: boolean
  onClose: () => void
}

export function ChatDialog({ open, onClose }: ChatDialogProps) {
  const [iframeSrc, setIframeSrc] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIframeSrc(`${window.location.origin}/chat`)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Live chat"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-dark_black/60 dark:bg-black/70 backdrop-blur-sm"
        aria-label="Close chat"
      />
      {/* Dialog box */}
      <div className="relative flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-dark_black">
        <div className="flex shrink-0 items-center justify-between border-b border-dark_black/10 px-4 py-3 dark:border-white/10">
          <h2 className="text-lg font-semibold text-dark_black dark:text-white">
            Live chat
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-dark_black/70 transition-colors hover:bg-dark_black/5 hover:text-dark_black dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              title="Live chat"
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-dark_black/60 dark:text-white/60">
              Loading…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
