import type { ScheduleEvent } from '../lib/types'
import { GoogleCalendarButton } from './GoogleCalendarButton'

type Props = {
  events: ScheduleEvent[]
  onRemove: (id: string) => void
  onGcalConnected: () => void
  onGcalDisconnected: () => void
  gcalConnected: boolean
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function isUpcoming(event: ScheduleEvent) {
  const now = new Date()
  const diff = event.startTime.getTime() - now.getTime()
  return diff > 0 && diff < 15 * 60 * 1000 // within 15 min
}

function isPast(event: ScheduleEvent) {
  return event.startTime < new Date()
}

export function SchedulePanel({ events, onRemove, onGcalConnected, onGcalDisconnected, gcalConnected }: Props) {
  const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  return (
    <section className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="font-mono text-sm tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
          schedule
        </span>
        <div className="flex items-center gap-3">
          <GoogleCalendarButton
            connected={gcalConnected}
            onConnected={onGcalConnected}
            onDisconnected={onGcalDisconnected}
          />
          <span className="font-mono text-sm" style={{ color: gcalConnected ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="px-4 py-8 font-mono text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
            say "schedule X at Y time"
          </p>
        )}

        {sorted.map(event => {
          const upcoming = isUpcoming(event)
          const past = isPast(event)

          return (
            <div
              key={event.id}
              className="group flex items-center gap-3 px-4 py-3 border-b fade-in"
              style={{ borderColor: 'var(--border)', opacity: past ? 0.4 : 1 }}
            >
              {/* Time */}
              <span className="font-mono text-sm shrink-0 w-14" style={{ color: 'var(--muted-foreground)' }}>
                {formatTime(event.startTime)}
              </span>

              {/* Dot */}
              <div
                className="shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: upcoming ? 'var(--foreground)' : 'var(--border)' }}
              />

              {/* Title */}
              <span className="flex-1 text-sm" style={{ color: 'var(--foreground)' }}>
                {event.title}
              </span>

              {/* Upcoming badge */}
              {upcoming && (
                <span
                  className="font-mono text-sm px-2 py-0.5 border"
                  style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)' }}
                >
                  soon
                </span>
              )}

              <button
                onClick={() => onRemove(event.id)}
                className="opacity-0 group-hover:opacity-100 font-mono text-sm transition-opacity"
                style={{ color: 'var(--muted-foreground)' }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
