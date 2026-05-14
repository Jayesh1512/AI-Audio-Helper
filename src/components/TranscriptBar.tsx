type Props = {
  transcript: string
  interim: string
  mode: string
}

export function TranscriptBar({ transcript, interim, mode }: Props) {
  const display = interim || transcript

  if (!display && mode === 'idle') return null

  return (
    <div
      className="border-b px-6 py-3 fade-in"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <span className="font-mono text-sm shrink-0" style={{ color: 'var(--muted-foreground)' }}>
          transcript
        </span>
        <span
          className="font-mono text-sm flex-1 truncate"
          style={{ color: interim ? 'var(--muted-foreground)' : 'var(--foreground)' }}
        >
          {display || '—'}
          {interim && <span className="cursor-blink ml-[1px]">|</span>}
        </span>
        {mode === 'meeting' && (
          <span
            className="font-mono text-sm shrink-0 px-2 py-0.5 border rounded"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
          >
            rec
          </span>
        )}
      </div>
    </div>
  )
}
