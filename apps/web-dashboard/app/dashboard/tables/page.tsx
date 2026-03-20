'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Users, RefreshCw, LayoutGrid, Clock } from 'lucide-react'
import clsx from 'clsx'

const API = 'http://localhost:3001'
const SLOT_DURATION_MIN = 90

// ─── Types ────────────────────────────────────────────────────────────────────

type TableShape = 'round' | 'square' | 'rectangle'

type Table = {
  id:          string
  name:        string
  capacity:    number
  minCapacity: number
  isActive:    boolean
  shape:       TableShape
  posX:        number | null
  posY:        number | null
}

type Booking = {
  id:         string
  time:       string          // "19:00"
  status:     string
  guestCount: number
  guestName:  string
  tableId:    string | null
}

type Restaurant = { id: string; name: string; emoji?: string }

type TableStatus = 'free' | 'reserved' | 'occupied'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTableStatus(table: Table, bookings: Booking[]): { status: TableStatus; booking?: Booking } {
  const active = bookings.filter(
    b => b.tableId === table.id && ['confirmed', 'pending'].includes(b.status)
  )
  if (active.length === 0) return { status: 'free' }

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  for (const b of active) {
    const [h, m] = b.time.split(':').map(Number)
    const startMin = h * 60 + m
    const endMin   = startMin + SLOT_DURATION_MIN
    if (nowMin >= startMin && nowMin < endMin) return { status: 'occupied', booking: b }
  }

  // has bookings today but none currently active → reserved
  return { status: 'reserved', booking: active[0] }
}

const STATUS_META = {
  free:     { label: 'Wolny',        dot: 'bg-[#2D6A35]',  text: 'text-[#2D6A35]',  ring: 'ring-[#2D6A35]/30',  card: 'border-[#2A3D2C]' },
  reserved: { label: 'Zarezerwowany', dot: 'bg-yellow-400', text: 'text-yellow-400', ring: 'ring-yellow-400/30', card: 'border-yellow-400/30' },
  occupied: { label: 'Zajęty',       dot: 'bg-red-400',    text: 'text-red-400',    ring: 'ring-red-400/30',    card: 'border-red-400/30' },
} as const

// ─── Table shape visual ───────────────────────────────────────────────────────

function TableShape({ shape, status, capacity }: { shape: TableShape; status: TableStatus; capacity: number }) {
  const color = {
    free:     'bg-[#2D6A35]/15 border-[#2D6A35]/40',
    reserved: 'bg-yellow-400/10 border-yellow-400/40',
    occupied: 'bg-red-400/10 border-red-400/40',
  }[status]

  const base = `border-2 flex items-center justify-center ${color}`
  const icon = <span className="text-xs font-bold text-[#E8F0E9]/60">{capacity}</span>

  if (shape === 'round')     return <div className={`${base} w-14 h-14 rounded-full`}>{icon}</div>
  if (shape === 'square')    return <div className={`${base} w-14 h-14 rounded-lg`}>{icon}</div>
  /* rectangle */            return <div className={`${base} w-20 h-12 rounded-lg`}>{icon}</div>
}

// ─── Add Table Modal ──────────────────────────────────────────────────────────

function AddTableModal({
  restaurantId,
  token,
  onClose,
  onCreated,
}: {
  restaurantId: string
  token: string
  onClose:   () => void
  onCreated: (t: Table) => void
}) {
  const [name,     setName]     = useState('')
  const [capacity, setCapacity] = useState(4)
  const [shape,    setShape]    = useState<TableShape>('round')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/restaurants/${restaurantId}/tables`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), capacity, shape }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Błąd'); return }
      onCreated(data)
      onClose()
    } catch {
      setError('Nie można połączyć się z serwerem')
    } finally {
      setLoading(false)
    }
  }

  const shapes: { value: TableShape; label: string; preview: string }[] = [
    { value: 'round',     label: 'Okrągły',    preview: 'rounded-full w-8 h-8' },
    { value: 'square',    label: 'Kwadratowy', preview: 'rounded-md w-8 h-8' },
    { value: 'rectangle', label: 'Prostokąt',  preview: 'rounded-md w-12 h-7' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-[#1C2B1E] border border-[#2A3D2C] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A3D2C]">
          <h2 className="font-semibold text-[#E8F0E9]">Dodaj stół</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B8F6E] hover:text-[#E8F0E9] hover:bg-[#2A3D2C] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">Nazwa / numer</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="np. A1, Taras 2, Okno"
              className="w-full bg-[#131A14] border border-[#2A3D2C] rounded-lg px-3 py-2.5 text-sm text-[#E8F0E9] placeholder-[#6B8F6E] focus:outline-none focus:border-[#2D6A35] transition-colors"
            />
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">
              Liczba miejsc
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCapacity(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-lg bg-[#131A14] border border-[#2A3D2C] text-[#E8F0E9] hover:border-[#2D6A35] transition-colors text-lg">−</button>
              <span className="w-8 text-center text-lg font-semibold text-[#E8F0E9]">{capacity}</span>
              <button type="button" onClick={() => setCapacity(c => Math.min(20, c + 1))}
                className="w-9 h-9 rounded-lg bg-[#131A14] border border-[#2A3D2C] text-[#E8F0E9] hover:border-[#2D6A35] transition-colors text-lg">+</button>
              <div className="flex gap-1 ml-1 flex-wrap">
                {[2, 4, 6, 8, 10].map(n => (
                  <button key={n} type="button" onClick={() => setCapacity(n)}
                    className={clsx('w-7 h-7 rounded text-xs font-medium transition-colors',
                      capacity === n ? 'bg-[#2D6A35] text-white' : 'bg-[#131A14] border border-[#2A3D2C] text-[#6B8F6E] hover:border-[#2D6A35]'
                    )}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shape */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">Kształt</label>
            <div className="grid grid-cols-3 gap-2">
              {shapes.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setShape(s.value)}
                  className={clsx(
                    'flex flex-col items-center gap-2 py-3 rounded-xl border transition-colors',
                    shape === s.value
                      ? 'border-[#2D6A35] bg-[#2D6A35]/10'
                      : 'border-[#2A3D2C] bg-[#131A14] hover:border-[#6B8F6E]'
                  )}
                >
                  <div className={clsx(
                    s.preview,
                    'border-2',
                    shape === s.value ? 'border-[#2D6A35] bg-[#2D6A35]/20' : 'border-[#6B8F6E]/40 bg-[#6B8F6E]/10'
                  )} />
                  <span className="text-xs text-[#6B8F6E]">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#2A3D2C] text-sm text-[#6B8F6E] hover:text-[#E8F0E9] hover:border-[#6B8F6E] transition-colors">
              Anuluj
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-[#2D6A35] hover:bg-[#378040] disabled:opacity-50 text-white text-sm font-medium transition-colors">
              {loading ? 'Tworzenie…' : 'Dodaj stół'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Table card ───────────────────────────────────────────────────────────────

function TableCard({ table, booking, status }: { table: Table; booking?: Booking; status: TableStatus }) {
  const meta = STATUS_META[status]

  return (
    <div className={clsx(
      'bg-[#1C2B1E] border rounded-2xl p-4 flex flex-col items-center gap-3 transition-all',
      'hover:scale-[1.02] cursor-default ring-1 ring-transparent hover:ring-1',
      meta.card, `hover:${meta.ring}`
    )}>
      {/* Shape visual */}
      <TableShape shape={table.shape} status={status} capacity={table.capacity} />

      {/* Name */}
      <div className="text-center">
        <p className="font-semibold text-[#E8F0E9] text-sm">{table.name}</p>
        <p className="text-xs text-[#6B8F6E] flex items-center justify-center gap-1 mt-0.5">
          <Users size={10} /> {table.capacity} os.
        </p>
      </div>

      {/* Status badge */}
      <div className={clsx('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full', meta.text, 'bg-current/10')}>
        <span className={clsx('w-1.5 h-1.5 rounded-full', meta.dot)} />
        <span className={meta.text}>{meta.label}</span>
      </div>

      {/* Booking info */}
      {booking && (
        <div className="w-full bg-[#131A14] rounded-lg px-3 py-2 text-center">
          <p className="text-xs font-medium text-[#E8F0E9] truncate">{booking.guestName}</p>
          <p className="text-xs text-[#6B8F6E] flex items-center justify-center gap-1 mt-0.5">
            <Clock size={9} /> {booking.time}
            <span className="mx-1">·</span>
            <Users size={9} /> {booking.guestCount}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TablesPage() {
  const router = useRouter()

  const [token,       setToken]       = useState<string | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [activeId,    setActiveId]    = useState<string | null>(null)
  const [tables,      setTables]      = useState<Table[]>([])
  const [bookings,    setBookings]    = useState<Booking[]>([])
  const [loading,     setLoading]     = useState(false)
  const [showModal,   setShowModal]   = useState(false)

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('stolik_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
  }, [router])

  // ── restaurants ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/restaurants`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Restaurant[]) => {
        setRestaurants(data)
        if (data.length > 0) setActiveId(data[0].id)
      })
  }, [token])

  // ── tables + today's bookings ─────────────────────────────────────────────
  const fetchData = useCallback(async (restaurantId: string) => {
    if (!token) return
    setLoading(true)
    try {
      const [tablesRes, bookingsRes] = await Promise.all([
        fetch(`${API}/api/restaurants/${restaurantId}/tables`,    { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/bookings/today/${restaurantId}`,        { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [tablesData, bookingsData] = await Promise.all([tablesRes.json(), bookingsRes.json()])
      setTables(Array.isArray(tablesData)   ? tablesData   : [])
      setBookings(Array.isArray(bookingsData) ? bookingsData : [])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeId) fetchData(activeId)
  }, [activeId, fetchData])

  // ── refresh every 60s ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeId) return
    const id = setInterval(() => fetchData(activeId), 60_000)
    return () => clearInterval(id)
  }, [activeId, fetchData])

  if (!token) return null

  const activeRestaurant = restaurants.find(r => r.id === activeId)
  const activeTables     = tables.filter(t => t.isActive)

  const counts = {
    free:     activeTables.filter(t => getTableStatus(t, bookings).status === 'free').length,
    reserved: activeTables.filter(t => getTableStatus(t, bookings).status === 'reserved').length,
    occupied: activeTables.filter(t => getTableStatus(t, bookings).status === 'occupied').length,
  }

  return (
    <div className="min-h-screen bg-[#131A14] text-[#E8F0E9]">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#2A3D2C] bg-[#1C2B1E] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="text-[#6B8F6E] hover:text-[#E8F0E9] transition-colors text-sm">
            ← Dashboard
          </button>
          <div className="w-px h-4 bg-[#2A3D2C]" />
          <div className="flex items-center gap-2">
            <LayoutGrid size={15} className="text-[#6B8F6E]" />
            <h1 className="font-semibold">
              {activeRestaurant?.emoji} {activeRestaurant?.name} — Plan sali
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Restaurant switcher */}
          {restaurants.length > 1 && (
            <div className="flex gap-1">
              {restaurants.map(r => (
                <button key={r.id} onClick={() => setActiveId(r.id)}
                  className={clsx('px-3 py-1.5 rounded-lg text-sm transition-colors',
                    activeId === r.id ? 'bg-[#2D6A35] text-white' : 'text-[#6B8F6E] hover:text-[#E8F0E9] hover:bg-[#2A3D2C]'
                  )}>
                  {r.emoji} {r.name}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => activeId && fetchData(activeId)} disabled={loading}
            className="flex items-center gap-1.5 text-sm text-[#6B8F6E] hover:text-[#E8F0E9] transition-colors disabled:opacity-40">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {activeId && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D6A35] hover:bg-[#378040] text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={14} /> Dodaj stół
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Stats bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 mb-8 p-4 bg-[#1C2B1E] border border-[#2A3D2C] rounded-xl">
          {([
            { key: 'free',     label: 'Wolne',          color: 'bg-[#2D6A35]' },
            { key: 'reserved', label: 'Zarezerwowane',  color: 'bg-yellow-400' },
            { key: 'occupied', label: 'Zajęte',         color: 'bg-red-400' },
          ] as const).map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-2xl font-semibold text-[#E8F0E9]">{counts[key]}</span>
              <span className="text-sm text-[#6B8F6E]">{label}</span>
            </div>
          ))}
          <div className="ml-auto text-sm text-[#6B8F6E]">
            {activeTables.length} {activeTables.length === 1 ? 'stół' : 'stoły/stoliki'} łącznie
          </div>
        </div>

        {/* ── Floor plan grid ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-32 text-[#6B8F6E]">
            <RefreshCw size={20} className="animate-spin mr-3" /> Ładowanie…
          </div>
        ) : activeTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-[#6B8F6E] gap-4">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#2A3D2C] flex items-center justify-center">
              <Plus size={24} className="text-[#2A3D2C]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#E8F0E9]">Brak stolików</p>
              <p className="text-xs text-[#6B8F6E] mt-1">Dodaj pierwszy stół, aby zobaczyć plan sali</p>
            </div>
            {activeId && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2D6A35] hover:bg-[#378040] text-white text-sm font-medium rounded-lg transition-colors">
                <Plus size={14} /> Dodaj stół
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs text-[#6B8F6E]">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={clsx('w-2 h-2 rounded-full', meta.dot)} />
                  {meta.label}
                </span>
              ))}
              <span className="ml-auto flex items-center gap-1">
                <RefreshCw size={10} /> Odświeżanie co 60s
              </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {activeTables.map(table => {
                const { status, booking } = getTableStatus(table, bookings)
                return (
                  <TableCard key={table.id} table={table} status={status} booking={booking} />
                )
              })}

              {/* Add new tile */}
              {activeId && (
                <button onClick={() => setShowModal(true)}
                  className="border-2 border-dashed border-[#2A3D2C] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-[#2A3D2C] hover:border-[#2D6A35] hover:text-[#2D6A35] transition-colors min-h-[160px]">
                  <Plus size={20} />
                  <span className="text-xs">Dodaj</span>
                </button>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showModal && activeId && token && (
        <AddTableModal
          restaurantId={activeId}
          token={token}
          onClose={() => setShowModal(false)}
          onCreated={t => setTables(prev => [...prev, t])}
        />
      )}
    </div>
  )
}
