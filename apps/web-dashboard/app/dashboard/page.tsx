'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { LogOut, Users, Clock, CheckCircle, XCircle, RefreshCw, Plus } from 'lucide-react'
import clsx from 'clsx'
import CreateBookingModal from '@/components/CreateBookingModal'

const API = 'http://localhost:3001'

type Booking = {
  id:          string
  bookingRef:  string
  status:      string
  time:        string
  guestCount:  number
  guestName:   string
  guestPhone:  string
  notes?:      string
  table?:      { id: string; name: string } | null
}

type Restaurant = {
  id:   string
  name: string
  emoji?: string
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Oczekuje',
  confirmed: 'Potwierdzona',
  cancelled: 'Anulowana',
  completed: 'Zakończona',
  no_show:   'No-show',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  confirmed: 'text-green-400 bg-green-400/10 border-green-400/20',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
  completed: 'text-muted bg-border/40 border-border',
  no_show:   'text-red-500 bg-red-500/10 border-red-500/20',
}

export default function DashboardPage() {
  const router = useRouter()

  const [token,       setToken]       = useState<string | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [activeId,    setActiveId]    = useState<string | null>(null)
  const [bookings,    setBookings]    = useState<Booking[]>([])
  const [loading,     setLoading]     = useState(false)
  const [updating,    setUpdating]    = useState<string | null>(null)
  const [showModal,   setShowModal]   = useState(false)

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('stolik_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
  }, [router])

  // ── fetch owner's restaurants ─────────────────────────────────────────────
  useEffect(() => {
    if (!token) return

    fetch(`${API}/api/restaurants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: Restaurant[]) => {
        setRestaurants(data)
        if (data.length > 0) setActiveId(data[0].id)
      })
      .catch(console.error)
  }, [token])

  // ── fetch today's bookings ────────────────────────────────────────────────
  const fetchBookings = useCallback(async (restaurantId: string) => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/bookings/today/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeId) fetchBookings(activeId)
  }, [activeId, fetchBookings])

  // ── update booking status ─────────────────────────────────────────────────
  async function updateStatus(bookingId: string, status: string) {
    if (!token) return
    setUpdating(bookingId)
    try {
      await fetch(`${API}/api/bookings/${bookingId}/status`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status } : b)
      )
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  function logout() {
    localStorage.removeItem('stolik_token')
    localStorage.removeItem('stolik_user')
    router.push('/login')
  }

  const today = format(new Date(), 'EEEE, d MMMM', { locale: pl })
  const activeRestaurant = restaurants.find(r => r.id === activeId)

  const counts = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    noShow:    bookings.filter(b => b.status === 'no_show').length,
  }

  if (!token) return null

  return (
    <div className="min-h-screen flex flex-col">
      {showModal && activeId && (
        <CreateBookingModal
          restaurantId={activeId}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchBookings(activeId) }}
        />
      )}

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🍽️</span>
          <span className="font-semibold text-text">Stolik</span>
        </div>

        {/* Restaurant tabs */}
        {restaurants.length > 1 && (
          <div className="flex gap-1">
            {restaurants.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className={clsx(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  activeId === r.id
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-text hover:bg-border/40'
                )}
              >
                {r.emoji} {r.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/billing"
            className="text-xs text-muted hover:text-accent border border-border hover:border-accent/50 rounded-lg px-3 py-1.5 transition-colors"
          >
            💳 Plany
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors"
          >
            <LogOut size={16} />
            Wyloguj
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">

        {/* ── Page title ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-text capitalize">
              {activeRestaurant?.emoji} {activeRestaurant?.name}
            </h1>
            <p className="text-sm text-muted mt-0.5 capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => activeId && fetchBookings(activeId)}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Odśwież
            </button>
            {activeId && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={14} />
                Nowa rezerwacja
              </button>
            )}
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Łącznie',      value: counts.total,     icon: Users },
            { label: 'Potwierdzone', value: counts.confirmed, icon: CheckCircle },
            { label: 'Oczekuje',     value: counts.pending,   icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Icon size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-text">{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Booking list ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted">
            <RefreshCw size={20} className="animate-spin mr-3" />
            Ładowanie…
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-4xl mb-3">🗓️</p>
            <p className="text-sm">Brak rezerwacji na dziś</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings
              .sort((a, b) => a.time.localeCompare(b.time))
              .map(booking => (
                <div
                  key={booking.id}
                  className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center gap-4"
                >
                  {/* Time */}
                  <div className="w-14 text-center shrink-0">
                    <p className="text-lg font-semibold text-text">{booking.time}</p>
                  </div>

                  <div className="w-px h-10 bg-border shrink-0" />

                  {/* Guest info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-text">{booking.guestName}</p>
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full border',
                        STATUS_COLORS[booking.status] ?? 'text-muted border-border'
                      )}>
                        {STATUS_LABELS[booking.status] ?? booking.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {booking.guestCount} os.
                      </span>
                      {booking.table && (
                        <span>Stół: {booking.table.name}</span>
                      )}
                      <span>{booking.bookingRef}</span>
                      {booking.notes && (
                        <span className="text-yellow-500/80 italic">💬 {booking.notes}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <div className="flex gap-2 shrink-0">
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(booking.id, 'confirmed')}
                          disabled={updating === booking.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <CheckCircle size={13} />
                          Potwierdź
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(booking.id, 'no_show')}
                        disabled={updating === booking.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-400 border border-red-500/20 text-xs font-medium rounded-lg transition-colors"
                      >
                        <XCircle size={13} />
                        No-show
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  )
}
