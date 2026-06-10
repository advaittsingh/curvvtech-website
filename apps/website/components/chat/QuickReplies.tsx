'use client'

const QUICK_REPLIES = [
  'Get Website Quote',
  'Mobile App Development',
  'Custom Software',
  'Talk to Sales'
]

type Props = {
  onSelect: (text: string) => void
  disabled?: boolean
}

export function QuickReplies({ onSelect, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_REPLIES.map((label) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(label)}
          className="rounded-full border border-dark_black/20 dark:border-white/30 bg-white dark:bg-dark_black px-3 py-1.5 text-xs font-medium text-dark_black dark:text-white transition-colors hover:bg-dark_black/5 dark:hover:bg-white/10 disabled:opacity-50"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
