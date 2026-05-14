import { useState } from 'react'
import { gcal } from '../lib/googleCalendar'

type Props = {
  connected: boolean
  onConnected: () => void
  onDisconnected: () => void
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export function GoogleCalendarButton({ connected, onConnected, onDisconnected }: Props) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!CLIENT_ID) return
    setLoading(true)
    await gcal.init(CLIENT_ID)
    const ok = await gcal.connect()
    setLoading(false)
    if (ok) {
      onConnected()
    }
  }

  const handleDisconnect = () => {
    gcal.disconnect()
    onDisconnected()
  }

  if (!CLIENT_ID) {
    return (
      <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
        add VITE_GOOGLE_CLIENT_ID to .env
      </span>
    )
  }

  return (
    <button
      onClick={connected ? handleDisconnect : handleConnect}
      disabled={loading}
      className="font-mono text-sm px-3 py-1.5 border rounded transition-all"
      style={{
        borderColor: connected ? 'var(--foreground)' : 'var(--border)',
        color: connected ? 'var(--foreground)' : 'var(--muted-foreground)',
        backgroundColor: connected ? 'var(--accent)' : 'transparent',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? 'connecting...' : connected ? '✓ gcal' : 'connect gcal'}
    </button>
  )
}
