# AI Assistant - Project Summary

## Overview
**ai-assistant** is a voice-based AI productivity assistant that transforms spoken commands into actionable tasks. It combines real-time speech recognition, AI-powered intent classification, and calendar integration to help users manage todos, schedule events, and capture meeting notes—all through natural voice interaction.

## Core Features

### 1. **Voice Recognition & Transcription**
- Supports two speech-to-text providers:
  - **Deepgram**: Cloud-based, high-accuracy transcription
  - **Web Speech API**: Browser-native, no additional setup needed
- Real-time transcript display with interim (partial) results
- Volume level monitoring via Web Audio API

### 2. **Intelligent Intent Classification**
- Classifies voice commands into actionable intents:
  - `ADD_TODO`: Create a new task from voice input
  - `SCHEDULE_EVENT`: Add a time-blocked event to calendar
  - `MEETING_START`: Begin recording a meeting transcript
  - `MEETING_END`: Stop recording and summarize the meeting
  - `NOISE`: Ignore non-actionable input
- Uses either **Gemini API** (cloud) or **Ollama** (local LLM) for classification
- Falls back to keyword matching when LLMs are unavailable

### 3. **Todo Management**
- Create todos from voice commands with automatic topic detection
- Toggle completion status
- Delete todos
- Persistent storage

### 4. **Schedule & Calendar Management**
- Add time-blocked events with voice commands
- Smart event parsing from natural language (detects times and titles)
- **Google Calendar Integration**:
  - Sync Google Calendar events into the app (60-second interval)
  - Push new events back to Google Calendar
  - Auto-detect duplicate events within 1-minute tolerance
  - Restore connection from stored credentials

### 5. **Meeting Capture & Summarization**
- Record full meeting transcripts by detecting "start meeting" / "end meeting" commands
- Auto-summarize meetings with:
  - **Gemini API**: For cloud-based, multi-sentence summaries
  - **Ollama**: For local, on-device summarization
  - **Fallback**: First 300 characters of transcript if LLM is offline
- Store meetings with metadata (start/end time, speakers, summary)

### 6. **UI & UX**
- **Three-panel layout**:
  1. Left: Todo list (create, toggle, delete)
  2. Center: Schedule/Calendar (add events, sync Google Calendar)
  3. Right: Meeting history (start/record/end, view summaries)
- **Header**: Listening mode indicator, volume meter, theme toggle
- **Transcript Bar**: Real-time display of recognized speech
- **Status Bar**: LLM availability, Google Calendar connection status, last action log
- **Dark Mode**: System preference detection with manual toggle

## Architecture

### State Management
- React hooks (`useState`, `useRef`, `useCallback`, `useEffect`)
- Custom hooks: `useVoice` (speech), `useTodos`, `useSchedule`, `useMeetings`
- Global config via `config.ts`

### Key Files
```
src/
├── App.tsx                    # Main app logic, intent handling
├── hooks/
│   └── useVoice.ts           # Voice recognition, intent classification
├── components/
│   ├── Header.tsx            # Top bar with controls
│   ├── TranscriptBar.tsx     # Real-time speech display
│   ├── TodoPanel.tsx         # Todo management UI
│   ├── SchedulePanel.tsx     # Calendar/schedule UI
│   ├── MeetingPanel.tsx      # Meeting recording & history
│   └── StatusBar.tsx         # Connection status indicators
└── lib/
    ├── config.ts            # Configuration & API keys
    ├── gemini.ts            # Gemini API integration
    ├── deepgram.ts          # Deepgram speech service
    ├── googleCalendar.ts    # Google Calendar integration
    ├── smartRoute.ts        # Natural language time parsing
    ├── store.ts             # Data persistence
    └── types.ts             # TypeScript definitions
```

### External Integrations
- **Gemini API** (`@google/generative-ai`): Intent classification, meeting summarization
- **Deepgram SDK** (`@deepgram/sdk`): High-quality speech-to-text
- **Google Calendar API**: Event sync and creation
- **Ollama**: Local LLM for offline intent classification
- **Web Audio API**: Volume metering
- **Web Speech API**: Browser-native speech recognition

## Data Flow

```
Voice Input
    ↓
Speech Recognition (Deepgram or Web Speech API)
    ↓
Transcript Generated
    ↓
Intent Classification (Gemini or Ollama)
    ↓
Intent Handler
    ├─ ADD_TODO → Create todo + optional calendar event
    ├─ SCHEDULE_EVENT → Add event + sync to Google Calendar
    ├─ MEETING_START → Initialize meeting buffer
    ├─ MEETING_END → Summarize transcript + save meeting
    └─ NOISE → Ignore
    ↓
Display Update + Sync to External Services
```

## Configuration
Requires environment variables for API keys:
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth for Calendar integration
- `VITE_GEMINI_API_KEYS`: Gemini API keys (can rotate multiple keys)
- `VITE_DEEPGRAM_API_KEY`: Deepgram speech-to-text key (optional)
- `VITE_OLLAMA_BASE_URL`: Ollama server URL for local LLM (optional)

## Technology Stack
- **Frontend**: React 18.3.1, TypeScript, Tailwind CSS
- **Build**: Vite, PostCSS, Autoprefixer
- **AI/ML**: Google Generative AI (Gemini), Deepgram SDK, Ollama
- **APIs**: Google Calendar, Web Audio API, Web Speech API

## Key Behaviors
1. **Auto-listening**: Speech recognition auto-restarts when stopped
2. **Fallback chains**: Cloud → Local → Keyword matching
3. **Deduplication**: Prevents duplicate calendar events (60s tolerance)
4. **Graceful degradation**: Works offline with keyword-based intent detection
5. **Smart routing**: Voice command mentioning "meeting" + time auto-schedules event
6. **Background syncing**: Google Calendar events synced every 60 seconds when connected

## Use Cases
- Voice-based task management on the go
- Meeting transcription and note-taking
- Calendar event creation with natural language
- Offline-capable todo tracking (with local fallback)
- Real-time calendar sync across devices
