import type { ListeningMode } from '../lib/types'

type Props = {
  mode: ListeningMode
  volume: number
  onToggleListening: () => void
  onToggleTheme: () => void
  isDark: boolean
}

const modeLabel: Record<ListeningMode, string> = {
  idle: 'idle',
  listening: 'listening',
  meeting: 'meeting',
  processing: 'processing',
}

export function Header({ mode, volume, onToggleListening, onToggleTheme, isDark }: Props) {
  const isActive = mode !== 'idle'
  const bars = 5

  return (
    <header className="sticky top-0 z-50 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Left — wordmark */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
            assistant
          </span>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {modeLabel[mode]}
          </span>
        </div>

        {/* Center — volume bars */}
        <div className="flex items-center gap-[3px]">
          {Array.from({ length: bars }).map((_, i) => {
            const threshold = (i + 1) / bars
            const active = isActive && volume >= threshold
            return (
              <div
                key={i}
                className="w-[3px] rounded-sm transition-all duration-75"
                style={{
                  height: `${8 + i * 3}px`,
                  backgroundColor: active ? 'var(--foreground)' : 'var(--border)',
                }}
              />
            )
          })}
        </div>

        {/* Right — controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="font-mono text-sm px-3 py-1.5 border rounded transition-all"
            style={{ color: 'var(--muted-foreground)', borderColor: 'var(--border)', backgroundColor: 'var(--accent)' }}
          >
            {isDark ? 'light' : 'dark'}
          </button>

          <button
            onClick={onToggleListening}
            className="font-mono text-sm px-3 py-1.5 border rounded transition-all"
            style={{
              borderColor: isActive ? 'var(--foreground)' : 'var(--border)',
              color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
              backgroundColor: isActive ? 'var(--accent)' : 'transparent',
            }}
          >
            {isActive ? '◼ stop' : '● listen'}
          </button>
        </div>

      </div>
    </header>
  )
}
