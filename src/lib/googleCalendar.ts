const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const GOOGLE_CALENDAR_CONNECTION_STORAGE_KEY = 'GOOGLE_CALENDAR_CONNECTED'
const GOOGLE_CALENDAR_ACCESS_TOKEN_STORAGE_KEY = 'GOOGLE_CALENDAR_ACCESS_TOKEN'
const GOOGLE_CALENDAR_ACCESS_TOKEN_EXPIRY_STORAGE_KEY = 'GOOGLE_CALENDAR_ACCESS_TOKEN_EXPIRY'

export type GCalEvent = {
  id?: string
  summary: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
}

class GoogleCalendarService {
  private accessToken: string | null = null
  private tokenClient: google.accounts.oauth2.TokenClient | null = null

  isConnected() {
    return !!this.accessToken
  }

  hydrateFromStorage(): boolean {
    const storedToken = localStorage.getItem(GOOGLE_CALENDAR_ACCESS_TOKEN_STORAGE_KEY)
    const storedExpiryRaw = localStorage.getItem(GOOGLE_CALENDAR_ACCESS_TOKEN_EXPIRY_STORAGE_KEY)

    if (!storedToken || !storedExpiryRaw) return false

    const storedExpiry = parseInt(storedExpiryRaw, 10)
    if (!Number.isFinite(storedExpiry) || Date.now() >= storedExpiry) {
      this.clearStoredConnection()
      return false
    }

    this.accessToken = storedToken
    localStorage.setItem(GOOGLE_CALENDAR_CONNECTION_STORAGE_KEY, 'true')
    return true
  }

  async init(clientId: string): Promise<void> {
    return new Promise((resolve) => {
      // Load GSI script if not already loaded
      if (window.google?.accounts?.oauth2) {
        this.setup(clientId, resolve)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => this.setup(clientId, resolve)
      document.head.appendChild(script)
    })
  }

  private setup(clientId: string, onReady: () => void) {
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.access_token) {
          this.accessToken = response.access_token
        }
      },
    })
    onReady()
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.tokenClient) { resolve(false); return }
      const originalCallback = this.tokenClient.callback
      this.tokenClient.callback = (response) => {
        originalCallback?.(response)
        const isConnected = !!response.access_token
        if (isConnected) {
          this.persistConnection(response.access_token!, response.expires_in)
        }
        resolve(isConnected)
      }
      this.tokenClient.requestAccessToken()
    })
  }

  async restoreConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.tokenClient) {
        resolve(false)
        return
      }

      const wantsReconnect = localStorage.getItem(GOOGLE_CALENDAR_CONNECTION_STORAGE_KEY) === 'true'
      if (!wantsReconnect) {
        resolve(false)
        return
      }

      const originalCallback = this.tokenClient.callback
      this.tokenClient.callback = (response) => {
        originalCallback?.(response)
        const isConnected = !!response.access_token
        if (isConnected) {
          this.persistConnection(response.access_token!, response.expires_in)
        } else if (!this.hydrateFromStorage()) {
          this.clearStoredConnection()
        }
        resolve(isConnected)
      }
      this.tokenClient.requestAccessToken({ prompt: '' })
    })
  }

  disconnect() {
    if (this.accessToken) {
      window.google?.accounts.oauth2.revoke(this.accessToken, () => {})
    }
    this.accessToken = null
    this.clearStoredConnection()
  }

  private persistConnection(accessToken: string, expiresInSeconds?: number) {
    this.accessToken = accessToken
    localStorage.setItem(GOOGLE_CALENDAR_CONNECTION_STORAGE_KEY, 'true')
    localStorage.setItem(GOOGLE_CALENDAR_ACCESS_TOKEN_STORAGE_KEY, accessToken)
    if (typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds)) {
      const expiryEpochMs = Date.now() + expiresInSeconds * 1000
      localStorage.setItem(GOOGLE_CALENDAR_ACCESS_TOKEN_EXPIRY_STORAGE_KEY, String(expiryEpochMs))
    }
  }

  private clearStoredConnection() {
    localStorage.removeItem(GOOGLE_CALENDAR_CONNECTION_STORAGE_KEY)
    localStorage.removeItem(GOOGLE_CALENDAR_ACCESS_TOKEN_STORAGE_KEY)
    localStorage.removeItem(GOOGLE_CALENDAR_ACCESS_TOKEN_EXPIRY_STORAGE_KEY)
  }

  async addEvent(title: string, startTime: Date, endTime?: Date): Promise<GCalEvent | null> {
    if (!this.accessToken) return null

    const end = endTime ?? new Date(startTime.getTime() + 60 * 60 * 1000)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

    const event: GCalEvent = {
      summary: title,
      start: { dateTime: startTime.toISOString(), timeZone: tz },
      end: { dateTime: end.toISOString(), timeZone: tz },
    }

    try {
      const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      if (!res.ok) {
        if (res.status === 401) this.accessToken = null
        return null
      }
      return res.json()
    } catch {
      return null
    }
  }

  async fetchTodayEvents(): Promise<GCalEvent[]> {
    if (!this.accessToken) return []

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    try {
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      })
      const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      })
      if (!res.ok) return []
      const data = await res.json()
      return data.items ?? []
    } catch {
      return []
    }
  }
}

export const gcal = new GoogleCalendarService()

// GSI types
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void
          }) => google.accounts.oauth2.TokenClient
          revoke: (token: string, cb: () => void) => void
        }
      }
    }
  }
}

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    callback?: (response: { access_token?: string; expires_in?: number; error?: string }) => void
    requestAccessToken: (overrides?: { prompt?: string }) => void
  }
}
