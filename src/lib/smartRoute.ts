// Keywords that indicate a todo is also a schedule event
const MEETING_KEYWORDS = [
  'call', 'meeting', 'standup', 'stand-up', 'stand up', 'sync', 'catch up',
  'catchup', 'interview', 'demo', 'presentation', 'review', 'join', 'attend',
  'conference', 'webinar', 'zoom', 'meet', 'teams', 'huddle',
]

// Regex patterns for time extraction
const TIME_PATTERNS = [
  // "at 10:45 a.m." / "at 10:45am" / "at 10:45 AM"
  /\bat\s+(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i,
  // "at 3pm" / "at 3 pm"
  /\bat\s+(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)/i,
  // "at 15:00" (24h)
  /\bat\s+(\d{1,2}):(\d{2})(?!\s*[ap])/i,
]

const DAY_PATTERNS = [
  { regex: /\btomorrow\b/i, offset: 1 },
  { regex: /\bday after tomorrow\b/i, offset: 2 },
  { regex: /\bnext monday\b/i, offset: (d: Date) => daysUntilWeekday(d, 1) + 7 },
  { regex: /\bnext tuesday\b/i, offset: (d: Date) => daysUntilWeekday(d, 2) + 7 },
  { regex: /\bnext wednesday\b/i, offset: (d: Date) => daysUntilWeekday(d, 3) + 7 },
  { regex: /\bnext thursday\b/i, offset: (d: Date) => daysUntilWeekday(d, 4) + 7 },
  { regex: /\bnext friday\b/i, offset: (d: Date) => daysUntilWeekday(d, 5) + 7 },
  { regex: /\bmonday\b/i, offset: (d: Date) => daysUntilWeekday(d, 1) },
  { regex: /\btuesday\b/i, offset: (d: Date) => daysUntilWeekday(d, 2) },
  { regex: /\bwednesday\b/i, offset: (d: Date) => daysUntilWeekday(d, 3) },
  { regex: /\bthursday\b/i, offset: (d: Date) => daysUntilWeekday(d, 4) },
  { regex: /\bfriday\b/i, offset: (d: Date) => daysUntilWeekday(d, 5) },
]

function daysUntilWeekday(from: Date, target: number): number {
  const current = from.getDay()
  let diff = target - current
  if (diff <= 0) diff += 7
  return diff
}

export function parseTimeFromText(text: string): Date | null {
  const lower = text.toLowerCase()
  const now = new Date()
  let baseDate = new Date(now)

  // Check for day offset
  for (const { regex, offset } of DAY_PATTERNS) {
    if (regex.test(lower)) {
      const days = typeof offset === 'function' ? offset(now) : offset
      baseDate = new Date(now)
      baseDate.setDate(baseDate.getDate() + days)
      break
    }
  }

  // Extract time
  for (const pattern of TIME_PATTERNS) {
    const match = lower.match(pattern)
    if (!match) continue

    let hours = parseInt(match[1])
    const minutes = parseInt(match[2] ?? '0')
    const meridiem = (match[3] ?? '').replace(/\./g, '').toLowerCase()

    if (meridiem === 'pm' && hours !== 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0

    const result = new Date(baseDate)
    result.setHours(hours, minutes, 0, 0)
    return result
  }

  return null
}

export function isMeetingRelated(text: string): boolean {
  const lower = text.toLowerCase()
  return MEETING_KEYWORDS.some(k => lower.includes(k))
}

// Returns schedule event info if this todo should also be added to schedule
export function extractScheduleInfo(text: string): { title: string; startTime: Date } | null {
  if (!isMeetingRelated(text)) return null
  const time = parseTimeFromText(text)
  if (!time) return null

  // Clean up title: remove time phrases
  const title = text
    .replace(/\b(at\s+\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)?)\b/gi, '')
    .replace(/\b(i will|i need to|remind me to|i have to)\b/gi, '')
    .replace(/\btomorrow\b/gi, '')
    .replace(/\bnext\s+\w+\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return { title: title || text, startTime: time }
}
