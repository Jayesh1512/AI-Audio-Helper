import { useEffect } from 'react'
import type { MeetingSummary } from '../lib/types'

type Props = {
  meeting: MeetingSummary
  onClose: () => void
}

export function MeetingSummaryModal({ meeting, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const duration = Math.round((meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 60000)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 border"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="font-mono text-sm tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
            meeting summary
          </span>
          <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {duration}m · {meeting.startedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>

        {/* Summary */}
        <div className="px-5 py-4 max-h-80 overflow-y-auto">
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--foreground)' }}
          >
            {meeting.summary}
          </p>
        </div>

        {/* Transcript toggle */}
        {meeting.transcript && (
          <details
            className="border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <summary
              className="px-5 py-3 font-mono text-sm cursor-pointer select-none"
              style={{ color: 'var(--muted-foreground)' }}
            >
              transcript
            </summary>
            <div className="px-5 pb-4 max-h-48 overflow-y-auto">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                {meeting.transcript}
              </p>
            </div>
          </details>
        )}

        {/* Footer */}
        <div
          className="flex justify-end px-5 py-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={onClose}
            className="font-mono text-sm px-4 py-2 border transition-all"
            style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)' }}
          >
            close
          </button>
        </div>
      </div>
    </div>
  )
}
