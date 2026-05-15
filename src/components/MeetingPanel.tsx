import type { MeetingSummary, ListeningMode } from '../lib/types'

type Props = {
  meetings: MeetingSummary[]
  mode: ListeningMode
  liveTranscript: string
  interimTranscript: string
  onStartMeeting: () => void
  onEndMeeting: () => void
}

function formatDuration(start: Date, end: Date) {
  const diff = Math.round((end.getTime() - start.getTime()) / 60000)
  return `${diff}m`
}

export function MeetingPanel({ meetings, mode, liveTranscript, interimTranscript, onStartMeeting, onEndMeeting }: Props) {
  const inMeeting = mode === 'meeting'

  return (
    <section className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="font-mono text-sm tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
          meetings
        </span>
        <button
          onClick={inMeeting ? onEndMeeting : onStartMeeting}
          className="font-mono text-sm px-3 py-1.5 border transition-all"
          style={{
            borderColor: inMeeting ? 'var(--foreground)' : 'var(--border)',
            color: inMeeting ? 'var(--foreground)' : 'var(--muted-foreground)',
            backgroundColor: inMeeting ? 'var(--accent)' : 'transparent',
          }}
        >
          {inMeeting ? '◼ end' : '● start'}
        </button>
      </div>

      {/* Active meeting indicator + live transcript */}
      {inMeeting && (
        <div
          className="flex flex-col gap-2 px-4 py-3 border-b fade-in overflow-y-auto"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)', maxHeight: '60%' }}
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--foreground)' }} />
              <div
                className="absolute inset-0 w-2 h-2 rounded-full pulse-ring"
                style={{ backgroundColor: 'var(--foreground)' }}
              />
            </div>
            <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
              recording — say "end meeting" to stop
            </span>
          </div>

          {(liveTranscript || interimTranscript) && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {liveTranscript}
              {interimTranscript && (
                <span style={{ color: 'var(--muted-foreground)' }}>{liveTranscript ? ' ' : ''}{interimTranscript}</span>
              )}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {meetings.length === 0 && !inMeeting && (
          <p className="px-4 py-8 font-mono text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
            say "start meeting" to begin recording
          </p>
        )}

        {meetings.map(meeting => (
          <div key={meeting.id} className="border-b fade-in" style={{ borderColor: 'var(--border)' }}>
            {/* Meeting meta */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                {meeting.startedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {formatTime(meeting.startedAt)} · {formatDuration(meeting.startedAt, meeting.endedAt)}
              </span>
            </div>

            {/* Summary */}
            <div className="px-4 pb-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
                {meeting.summary}
              </p>

              {meeting.speakers.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {meeting.speakers.map((s, i) => (
                    <span
                      key={i}
                      className="font-mono text-sm px-2 py-0.5 border"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}
