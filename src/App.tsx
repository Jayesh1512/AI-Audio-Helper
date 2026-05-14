import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from './components/Header'
import { TranscriptBar } from './components/TranscriptBar'
import { TodoPanel } from './components/TodoPanel'
import { SchedulePanel } from './components/SchedulePanel'
import { MeetingPanel } from './components/MeetingPanel'
import { StatusBar } from './components/StatusBar'
import { useVoice } from './hooks/useVoice'
import { useTodos, useSchedule, useMeetings } from './lib/store'
import { extractScheduleInfo } from './lib/smartRoute'
import { gcal } from './lib/googleCalendar'
import { config } from './lib/config'
import { summarizeMeetingWithGemini } from './lib/gemini'
import type { Intent } from './lib/types'

const CALENDAR_SYNC_INTERVAL_MS = 60000
const SAME_EVENT_TIME_TOLERANCE_MS = 60000
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export default function App() {
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [llmOnline, setLlmOnline] = useState(false)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [lastAction, setLastAction] = useState('')

  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos()
  const { events, addEvent, removeEvent } = useSchedule()
  const { meetings, addMeeting } = useMeetings()
  const importedGoogleEventIdsRef = useRef<Set<string>>(new Set())
  const scheduleEventsRef = useRef(events)

  useEffect(() => {
    scheduleEventsRef.current = events
  }, [events])

  // Check LLM availability
  useEffect(() => {
    if (config.llmProvider === 'ollama') {
      const check = async () => {
        try {
          const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(1500) })
          setLlmOnline(res.ok)
        } catch {
          setLlmOnline(false)
        }
      }
      check()
      const interval = setInterval(check, 15000)
      return () => clearInterval(interval)
    } else {
      // For Gemini, assume online if API key is set
      setLlmOnline(config.geminiApiKeys.length > 0)
    }
  }, [])

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    const tryRestoreGoogleCalendarConnection = async () => {
      if (!GOOGLE_CLIENT_ID) return

      const restoredFromStorage = gcal.hydrateFromStorage()
      if (restoredFromStorage) {
        setGcalConnected(true)
        setLastAction('google calendar restored')
      }

      await gcal.init(GOOGLE_CLIENT_ID)
      const restored = await gcal.restoreConnection()
      if (restored) {
        setGcalConnected(true)
        setLastAction('google calendar reconnected')
      }
    }

    tryRestoreGoogleCalendarConnection()
  }, [])

  const smartAddTodo = useCallback(async (text: string, raw: string) => {
    addTodo(text, raw)

    // Auto-route: if todo mentions a call/meeting + has a time → also add to schedule
    const scheduleInfo = extractScheduleInfo(text)
    if (scheduleInfo) {
      addEvent(scheduleInfo.title, scheduleInfo.startTime)
      setLastAction(`added todo + scheduled: "${scheduleInfo.title}"`)
      // Sync to Google Calendar if connected
      if (gcalConnected) {
        await gcal.addEvent(scheduleInfo.title, scheduleInfo.startTime)
      }
    } else {
      setLastAction(`added: "${text}"`)
    }
  }, [addTodo, addEvent, gcalConnected])

  const handleIntent = useCallback((intent: Intent, raw: string) => {
    switch (intent.type) {
      case 'ADD_TODO':
        smartAddTodo(intent.text, raw)
        break
      case 'SCHEDULE_EVENT': {
        addEvent(intent.title, new Date())
        setLastAction(`scheduled: "${intent.title}"`)
        if (gcalConnected) gcal.addEvent(intent.title, new Date())
        break
      }
      case 'MEETING_START':
        startMeeting()
        setLastAction('meeting started')
        break
      case 'MEETING_END':
        handleEndMeeting()
        break
      case 'NOISE':
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartAddTodo, addEvent, gcalConnected])

  const { mode, transcript, interimTranscript, volume, startListening, stopListening, startMeeting, endMeeting } = useVoice({
    onIntent: handleIntent,
  })

  const handleEndMeeting = useCallback(async () => {
    const fullTranscript = endMeeting()
    if (!fullTranscript) return

    setLastAction('summarising meeting...')

    // Summarise via configured LLM
    let summary = fullTranscript.slice(0, 300) + '...'
    if (config.llmProvider === 'gemini') {
      try {
        summary = await summarizeMeetingWithGemini(fullTranscript)
      } catch (error) {
        console.error('Gemini summarization failed:', error)
        // Use fallback
      }
    } else {
      try {
        const prompt = `Summarise this meeting transcript in 3-5 bullet points. Include key decisions and action items.\n\nTranscript:\n${fullTranscript}`
        const res = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'mistral', prompt, stream: false }),
          signal: AbortSignal.timeout(30000),
        })
        if (res.ok) {
          const data = await res.json()
          summary = data.response
        }
      } catch { /* use raw transcript snippet */ }
    }

    addMeeting({
      startedAt: new Date(Date.now() - 60000),
      endedAt: new Date(),
      transcript: fullTranscript,
      summary,
      speakers: ['You'],
    })
    setLastAction('meeting summary saved')
  }, [endMeeting, addMeeting])

  const handleToggleListening = () => {
    if (mode === 'idle') startListening()
    else stopListening()
  }

  const syncGoogleCalendarEvents = useCallback(async () => {
    if (!gcalConnected) return

    const googleEvents = await gcal.fetchTodayEvents()
    let importedCount = 0

    for (const googleEvent of googleEvents) {
      const title = googleEvent.summary?.trim()
      const startValue = googleEvent.start?.dateTime ?? googleEvent.start?.date
      const endValue = googleEvent.end?.dateTime ?? googleEvent.end?.date

      if (!title || !startValue) continue

      const startTime = new Date(startValue)
      if (Number.isNaN(startTime.getTime())) continue

      const endTime = endValue ? new Date(endValue) : undefined
      const importedId = googleEvent.id ?? `${title}:${startTime.getTime()}`

      if (importedGoogleEventIdsRef.current.has(importedId)) continue

      const alreadyInSchedule = scheduleEventsRef.current.some((existingEvent) => {
        const titleMatches = existingEvent.title === title
        const timeDifference = Math.abs(existingEvent.startTime.getTime() - startTime.getTime())
        return titleMatches && timeDifference <= SAME_EVENT_TIME_TOLERANCE_MS
      })

      if (alreadyInSchedule) {
        importedGoogleEventIdsRef.current.add(importedId)
        continue
      }

      addEvent(title, startTime, endTime)
      importedGoogleEventIdsRef.current.add(importedId)
      importedCount += 1
    }

    if (importedCount > 0) {
      const label = importedCount === 1 ? 'event' : 'events'
      setLastAction(`synced ${importedCount} calendar ${label}`)
    }
  }, [gcalConnected, addEvent])

  useEffect(() => {
    if (!gcalConnected) return

    syncGoogleCalendarEvents()
    const intervalId = window.setInterval(syncGoogleCalendarEvents, CALENDAR_SYNC_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [gcalConnected, syncGoogleCalendarEvents])

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Header
        mode={mode}
        volume={volume}
        onToggleListening={handleToggleListening}
        onToggleTheme={() => setIsDark(d => !d)}
        isDark={isDark}
      />

      <TranscriptBar transcript={transcript} interim={interimTranscript} mode={mode} />

      {/* Main grid */}
      <main className="flex-1 overflow-hidden grid grid-cols-3" style={{ borderColor: 'var(--border)' }}>
        {/* Col 1 — Todos */}
        <div className="overflow-hidden flex flex-col border-r" style={{ borderColor: 'var(--border)' }}>
          <TodoPanel
            todos={todos}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onAdd={(text) => { addTodo(text); setLastAction(`added: "${text}"`) }}
          />
        </div>

        {/* Col 2 — Schedule */}
        <div className="overflow-hidden flex flex-col border-r" style={{ borderColor: 'var(--border)' }}>
          <SchedulePanel
            events={events}
            onRemove={removeEvent}
            gcalConnected={gcalConnected}
            onGcalConnected={() => {
              setGcalConnected(true)
              setLastAction('google calendar connected')
            }}
            onGcalDisconnected={() => {
              setGcalConnected(false)
              importedGoogleEventIdsRef.current.clear()
              setLastAction('google calendar disconnected')
            }}
          />
        </div>

        {/* Col 3 — Meetings */}
        <div className="overflow-hidden flex flex-col">
          <MeetingPanel
            meetings={meetings}
            mode={mode}
            onStartMeeting={startMeeting}
            onEndMeeting={handleEndMeeting}
          />
        </div>
      </main>

      <StatusBar llmOnline={llmOnline} gcalConnected={gcalConnected} lastAction={lastAction} />
    </div>
  )
}
