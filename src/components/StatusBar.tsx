import { config } from '../lib/config'

type Props = {
  llmOnline: boolean
  gcalConnected: boolean
  lastAction: string
}

export function StatusBar({ llmOnline, gcalConnected, lastAction }: Props) {
  const llmLabel = config.llmProvider === 'gemini' ? 'gemini' : 'ollama'

  return (
    <footer
      className="border-t flex items-center justify-between px-6 h-10"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
    >
      <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
        {lastAction || '—'}
      </span>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: llmOnline ? 'var(--foreground)' : 'var(--border)' }}
          />
          <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {llmOnline ? llmLabel : `${llmLabel} offline`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: gcalConnected ? 'var(--foreground)' : 'var(--border)' }}
          />
          <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {gcalConnected ? 'gcal connected' : 'gcal disconnected'}
          </span>
        </div>
      </div>
    </footer>
  )
}
