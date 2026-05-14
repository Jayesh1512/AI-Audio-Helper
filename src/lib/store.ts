import { useState, useCallback } from 'react'
import type { TodoItem, ScheduleEvent, MeetingSummary } from './types'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

// --- Todos ---
export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', text: 'Set up voice enrollment', done: false, createdAt: new Date() },
    { id: '2', text: 'Install BlackHole for system audio', done: false, createdAt: new Date() },
  ])

  const addTodo = useCallback((text: string, sourceTranscript?: string) => {
    setTodos(prev => [
      { id: generateId(), text, done: false, createdAt: new Date(), sourceTranscript },
      ...prev,
    ])
  }, [])

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }, [])

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [])

  return { todos, addTodo, toggleTodo, deleteTodo }
}

// --- Schedule ---
export function useSchedule() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])

  const addEvent = useCallback((title: string, startTime: Date, endTime?: Date) => {
    setEvents(prev => [
      ...prev,
      { id: generateId(), title, startTime, endTime, notified: false },
    ])
  }, [])

  const removeEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
  }, [])

  return { events, addEvent, removeEvent }
}

// --- Meetings ---
export function useMeetings() {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([])

  const addMeeting = useCallback((meeting: Omit<MeetingSummary, 'id'>) => {
    setMeetings(prev => [{ id: generateId(), ...meeting }, ...prev])
  }, [])

  return { meetings, addMeeting }
}
