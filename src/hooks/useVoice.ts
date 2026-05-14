import { useState, useRef, useCallback, useEffect } from 'react'
import type { ListeningMode, Intent } from '../lib/types'
import { config } from '../lib/config'
import { DeepgramSpeechService } from '../lib/deepgram'
import { classifyIntentWithGemini } from '../lib/gemini'

// Browser Speech Recognition types
interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  onresult: ((e: SpeechRecognitionEvent) => void) | null
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition
    webkitSpeechRecognition?: new () => ISpeechRecognition
  }
}

const MEETING_START_KEYWORDS = ['start meeting', 'begin meeting', 'meeting start']
const MEETING_END_KEYWORDS = ['end meeting', 'stop meeting', 'meeting end', 'meeting over']

type UseVoiceOptions = {
  onIntent: (intent: Intent, transcript: string) => void
}

export function useVoice({ onIntent }: UseVoiceOptions) {
  const [mode, setMode] = useState<ListeningMode>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [volume, setVolume] = useState(0)

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const deepgramRef = useRef<DeepgramSpeechService | null>(null)
  const meetingBufferRef = useRef<string[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const isListeningRef = useRef(false)

  // Volume meter via Web Audio API
  const startVolumeMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length)
        setVolume(Math.min(rms / 80, 1))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // mic permission denied
    }
  }, [])

  const classifyIntent = useCallback(async (text: string): Promise<Intent> => {
    const lower = text.toLowerCase().trim()

    // Check meeting keywords first (no LLM needed)
    if (MEETING_START_KEYWORDS.some(k => lower.includes(k))) return { type: 'MEETING_START' }
    if (MEETING_END_KEYWORDS.some(k => lower.includes(k))) return { type: 'MEETING_END' }

    if (config.llmProvider === 'gemini') {
      try {
        return await classifyIntentWithGemini(text)
      } catch (error) {
        console.error('Gemini classification failed:', error)
        // Fallback to keyword matching
      }
    } else {
      // Try Ollama (desktop) first
      try {
        const prompt = `Classify the intent of this voice command into one of: ADD_TODO, SCHEDULE_EVENT, NOISE.
Voice command: "${text}"
Reply with JSON only: {"type":"ADD_TODO","text":"..."} or {"type":"SCHEDULE_EVENT","title":"...","time":"..."} or {"type":"NOISE"}`

        const res = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama3.2:3b', prompt, stream: false }),
          signal: AbortSignal.timeout(3000),
        })
        if (res.ok) {
          const data = await res.json()
          const match = data.response.match(/\{.*\}/s)
          if (match) return JSON.parse(match[0]) as Intent
        }
      } catch {
        // Ollama unavailable — fallback to keyword matching
      }
    }

    // Simple keyword fallback (works offline)
    if (/\b(i will|i need to|remind me to|i have to|i should|i must)\b/i.test(lower)) {
      return { type: 'ADD_TODO', text: text }
    }
    if (/\b(schedule|set|book|meeting at|call at|remind me at)\b/i.test(lower)) {
      return { type: 'SCHEDULE_EVENT', title: text, time: '' }
    }
    return { type: 'NOISE' }
  }, [])

  const startListening = useCallback(() => {
    if (config.speechProvider === 'deepgram' && config.deepgramApiKey) {
      // Use Deepgram
      const deepgram = new DeepgramSpeechService(
        config.deepgramApiKey,
        (transcript, isFinal) => {
          setInterimTranscript(isFinal ? '' : transcript)
          if (isFinal && transcript.trim()) {
            setTranscript(transcript.trim())
            setInterimTranscript('')
            // Buffer during meeting
            if (meetingBufferRef.current !== null && mode === 'meeting') {
              meetingBufferRef.current.push(transcript.trim())
            }
            setMode('processing')
            classifyIntent(transcript.trim()).then(intent => {
              onIntent(intent, transcript.trim())
              setMode(mode === 'meeting' ? 'meeting' : 'listening')
            })
          }
        },
        (error) => {
          console.error('Deepgram error:', error)
          setMode('idle')
        }
      )
      deepgramRef.current = deepgram
      deepgram.startListening()
      isListeningRef.current = true
      setMode('listening')
      startVolumeMeter()
    } else {
      // Use Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognition) return

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        isListeningRef.current = true
        setMode('listening')
      }

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            final += result[0].transcript
          } else {
            interim += result[0].transcript
          }
        }

        setInterimTranscript(interim)

        if (final.trim()) {
          setTranscript(final.trim())
          setInterimTranscript('')

          // Buffer during meeting
          if (meetingBufferRef.current !== null && mode === 'meeting') {
            meetingBufferRef.current.push(final.trim())
          }

          setMode('processing')
          const intent = await classifyIntent(final.trim())
          onIntent(intent, final.trim())
          setMode(mode === 'meeting' ? 'meeting' : 'listening')
        }
      }

      recognition.onend = () => {
        // Auto-restart to keep alive
        if (isListeningRef.current) {
          recognition.start()
        }
      }

      recognition.onerror = (e: { error: string }) => {
        if (e.error !== 'no-speech') console.error('Speech error:', e.error)
      }

      recognitionRef.current = recognition
      recognition.start()
      startVolumeMeter()
    }
  }, [mode, classifyIntent, onIntent, startVolumeMeter])

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (deepgramRef.current) {
      deepgramRef.current.stopListening()
      deepgramRef.current = null
    }
    cancelAnimationFrame(animFrameRef.current)
    setMode('idle')
    setVolume(0)
  }, [])

  const startMeeting = useCallback(() => {
    meetingBufferRef.current = []
    setMode('meeting')
  }, [])

  const endMeeting = useCallback(() => {
    const buffer = meetingBufferRef.current
    meetingBufferRef.current = []
    setMode('listening')
    return buffer.join(' ')
  }, [])

  useEffect(() => {
    return () => {
      isListeningRef.current = false
      recognitionRef.current?.stop()
      deepgramRef.current?.stopListening()
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return {
    mode,
    transcript,
    interimTranscript,
    volume,
    startListening,
    stopListening,
    startMeeting,
    endMeeting,
  }
}
