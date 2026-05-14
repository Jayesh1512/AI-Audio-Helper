export type TodoItem = {
  id: string
  text: string
  done: boolean
  createdAt: Date
  sourceTranscript?: string
}

export type ScheduleEvent = {
  id: string
  title: string
  startTime: Date
  endTime?: Date
  notified: boolean
}

export type MeetingSummary = {
  id: string
  startedAt: Date
  endedAt: Date
  transcript: string
  summary: string
  speakers: string[]
}

export type ListeningMode = 'idle' | 'listening' | 'meeting' | 'processing'

export type Intent =
  | { type: 'ADD_TODO'; text: string }
  | { type: 'SCHEDULE_EVENT'; title: string; time: string }
  | { type: 'MEETING_START' }
  | { type: 'MEETING_END' }
  | { type: 'NOISE' }
