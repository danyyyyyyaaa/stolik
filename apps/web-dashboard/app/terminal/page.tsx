'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { io as socketIo, type Socket } from 'socket.io-client'
import { CheckCircle, XCircle, Users, Wifi, WifiOff } from 'lucide-react'
import clsx from 'clsx'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

type Booking = {
  id:         string
  bookingRef: string
  status:     BookingStatus
  time:       string
  date:       string
  guestCount: number
  guestName:  string
  guestPhone?: string
  notes?:     string
  table?:     { id: string; name: string } | null
  isNew?:     boolean
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  pending:   { label: 'Pending',   badgeClass: 'text-yellow-300 bg-yellow-500/15 border border-yellow-500/30' },
  confirmed: { label: 'Confirmed', badgeClass: 'text-green-300  bg-green-500/15  border border-green-500/30'  },
  cancelled: { label: 'Cancelled', badgeClass: 'text-red-400    bg-red-500/15    border border-red-500/30'    },
  completed: { label: 'Completed', badgeClass: 'text-blue-300   bg-blue-500/15   border border-blue-500/30'   },
  no_show:   { label: 'No Show',   badgeClass: 'text-red-400    bg-red-500/15    border border-red-500/30'    },
}

// ─── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking, onConfirm, onCancel, updating,
}: {
  booking:   Booking
  onConfirm: (id: string) => void
  onCancel:  (id: string) => void
  updating:  string | null
}) {
  const busy = updating === booking.id
  const cfg  = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending

  return (
    <div className={clsx(
      'bg-[#161b22] border rounded-2xl p-5 flex flex-col gap-4 transition-shadow duration-300',
      booking.isNew ? 'border-[#238636] pulse-new' : 'border-[#30363d]',
    )}>
      {/* Time + status */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-3xl font-black text-white font-mono tracking-tight">
          {booking.time}
        </span>
        <span className={clsx('text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap', cfg.badgeClass)}>
          {cfg.label}
        </span>
      </div>

      {/* Guest info */}
      <div className="space-y-1.5 min-w-0">
        <p className="text-lg font-bold text-white leading-snug truncate">{booking.guestName}</p>
        <div className="flex items-center gap-2 text-sm text-[#8b949e]">
          <Users size={14} />
          <span>{booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}</span>
          {booking.table && (
            <>
              <span className="text-[#30363d]">·</span>
              <span>{booking.table.name}</span>
            </>
          )}
        </div>
        {booking.notes && (
          <p className="text-xs text-yellow-400/70 italic truncate">{booking.notes}</p>
        )}
        <p className="text-xs text-[#484f58] font-mono">{booking.bookingRef}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {booking.status === 'pending' && (
          <button
            onClick={() => onConfirm(booking.id)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors min-h-[48px]"
          >
            <CheckCircle size={16} />Confirm
          </button>
        )}
        {booking.status === 'confirmed' && (
          <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#238636]/20 text-[#3fb950] text-sm font-bold rounded-xl border border-[#238636]/30 min-h-[48px]">
            <CheckCircle size={16} />Confirmed
          </div>
        )}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <button
            onClick={() => onCancel(booking.id)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#21262d] hover:bg-[#da3633]/15 disabled:opacity-50 text-[#8b949e] hover:text-[#f85149] border border-[#30363d] hover:border-[#da3633]/30 text-sm font-bold rounded-xl transition-colors min-h-[48px]"
          >
            <XCircle size={16} />Cancel
          </button>
        )}
        {!['pending', 'confirmed'].includes(booking.status) && (
          <div className="flex-1 flex items-center justify-center py-3 text-[#484f58] text-sm font-medium rounded-xl border border-[#30363d] min-h-[48px]">
            {cfg.label}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Terminal page ─────────────────────────────────────────────────────────────

export default function TerminalPage() {
  const router = useRouter()

  const [token,          setToken]          = useState<string | null>(null)
  const [restaurantId,   setRestaurantId]   = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string>('')
  const [bookings,       setBookings]       = useState<Booking[]>([])
  const [loading,        setLoading]        = useState(true)
  const [connected,      setConnected]      = useState(false)
  const [updating,       setUpdating]       = useState<string | null>(null)

  const socketRef   = useRef<Socket | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Init — read auth + restaurant from localStorage
  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.replace('/login'); return }
    setToken(tok)

    try {
      const raw = localStorage.getItem('stolik_active_restaurant')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.id)   setRestaurantId(parsed.id)
        if (parsed?.name) setRestaurantName(parsed.name)
      }
    } catch {}
  }, [router])

  // Fetch today's bookings
  const fetchBookings = useCallback(async (rid: string, tok: string) => {
    try {
      const today = todayISO()
      const ctrl  = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 10_000)
      const res = await fetch(
        `${API}/api/bookings?restaurantId=${rid}&date=${today}`,
        { headers: { Authorization: `Bearer ${tok}` }, signal: ctrl.signal },
      )
      clearTimeout(timer)
      if (res.status === 401) { router.replace('/login'); return }
      const data = await res.json()
      setBookings(Array.isArray(data) ? data.map((b: Booking) => ({ ...b, isNew: false })) : [])
    } catch {
      // ignore abort / network errors
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!token || !restaurantId) return
    fetchBookings(restaurantId, token)

    intervalRef.current = setInterval(() => fetchBookings(restaurantId, token), 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [token, restaurantId, fetchBookings])

  // Socket.io
  useEffect(() => {
    if (!token || !restaurantId) return

    const socket = socketIo(API, {
      transports:        ['websocket', 'polling'],
      auth:              { token },
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.emit('join_restaurant', restaurantId)

    socket.on('booking:new', (data: any) => {
      playBeep()
      const newB: Booking = { ...data, isNew: true }
      setBookings(prev => prev.some(b => b.id === newB.id) ? prev : [newB, ...prev])
      setTimeout(() => {
        setBookings(prev => prev.map(b => b.id === newB.id ? { ...b, isNew: false } : b))
      }, 3000)
    })

    socket.on('booking:updated', (data: any) => {
      setBookings(prev => prev.map(b => b.id === data.bookingId ? { ...b, status: data.status } : b))
    })

    socket.on('booking:cancelled', (data: any) => {
      setBookings(prev => prev.map(b => b.id === data.bookingId ? { ...b, status: 'cancelled' } : b))
    })

    return () => { socket.disconnect() }
  }, [token, restaurantId])

  // Actions
  async function updateStatus(bookingId: string, status: BookingStatus) {
    if (!token) return
    setUpdating(bookingId)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    try {
      const ctrl  = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8_000)
      await fetch(`${API}/api/bookings/${bookingId}/status`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
        signal:  ctrl.signal,
      })
      clearTimeout(timer)
    } catch {}
    finally { setUpdating(null) }
  }

  const today         = todayISO()
  const todayDisplay  = formatDisplayDate(today)
  const todayBookings = bookings.sort((a, b) => a.time.localeCompare(b.time))

  if (!token) return null

  return (
    <>
      <style>{`
        @keyframes pulse-new {
          0%   { box-shadow: 0 0 0 0 #238636aa; }
          50%  { box-shadow: 0 0 0 14px #23863600; }
          100% { box-shadow: 0 0 0 0 #238636aa; }
        }
        .pulse-new { animation: pulse-new 2s ease-in-out; }
      `}</style>

      <div className="min-h-screen bg-[#0d1117] flex flex-col font-sans select-none">

        {/* Header */}
        <header className="bg-[#161b22] border-b border-[#30363d] px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">
              {restaurantName || 'Terminal'}
            </h1>
            <p className="text-sm text-[#8b949e] mt-0.5 capitalize">{todayDisplay}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-white tabular-nums">{todayBookings.length}</p>
            <p className="text-xs text-[#8b949e] mt-0.5">bookings today</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#238636] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[#8b949e] text-sm">Loading bookings…</p>
              </div>
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <p className="text-5xl mb-4">🗓️</p>
                <p className="text-[#8b949e] text-base">No bookings for today</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onConfirm={id => updateStatus(id, 'confirmed')}
                  onCancel={id  => updateStatus(id, 'cancelled')}
                  updating={updating}
                />
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-[#161b22] border-t border-[#30363d] px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-xs text-[#484f58] font-medium">Stolik Terminal</span>
          <div className="flex items-center gap-1.5">
            {connected ? (
              <>
                <Wifi size={13} className="text-[#3fb950]" />
                <span className="text-xs font-semibold text-[#3fb950]">Online</span>
              </>
            ) : (
              <>
                <WifiOff size={13} className="text-[#8b949e]" />
                <span className="text-xs font-semibold text-[#8b949e]">Offline</span>
              </>
            )}
          </div>
        </footer>

      </div>
    </>
  )
}
