'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Users, RefreshCw, Clock } from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n'

const API              = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'
const SLOT_DURATION_MIN = 90

type TableShape = 'round' | 'square' | 'rectangle'
type TableStatus = 'free' | 'reserved' | 'occupied'

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
  time:       string
  status:     string
  guestCount: number
  guestName:  string
  tableId:    string | null
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function getTableStatus(table: Table, bookings: Booking[]): { status: TableStatus; booking?: Booking } {
  const active = bookings.filter(
    b => b.tableId === table.id && ['confirmed', 'pending'].includes(b.status)
  )
  if (!active.length) return { status: 'free' }
  const now    = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  for (const b of active) {
    const [h, m]   = b.time.split(':').map(Number)
    const startMin = h * 60 + m
    if (nowMin >= startMin && nowMin < startMin + SLOT_DURATION_MIN)
      return { status: 'occupied', booking: b }
  }
  return { status: 'reserved', booking: active[0] }
}

// ─── Table shape visual ───────────────────────────────────────────────────────

function ShapeVisual({ shape, status, capacity }: { shape: TableShape; status: TableStatus; capacity: number }) {
  const colorMap: Record<TableStatus, string> = {
    free:     'border-accent/40     bg-accent/8',
    reserved: 'border-yellow-400/40 bg-yellow-400/8',
    occupied: 'border-red-400/40    bg-red-400/8',
  }
  const cls = `border-2 flex items-center justify-center ${colorMap[status]}`
  const num = <span className="text-xs font-bold text-text/60">{capacity}</span>
  if (shape === 'round')     return <div className={`${cls} w-14 h-14 rounded-full`}>{num}</div>
  if (shape === 'square')    return <div className={`${cls} w-14 h-14 rounded-xl`}>{num}</div>
  /* rectangle */            return <div className={`${cls} w-20 h-12 rounded-xl`}>{num}</div>
}

// ─── Table card ───────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<TableStatus, { dot: string; text: string; card: string }> = {
  free:     { dot: 'bg-accent',       text: 'text-accent',       card: 'border-border    hover:border-accent/40'         },
  reserved: { dot: 'bg-yellow-400',   text: 'text-yellow-400',   card: 'border-yellow-400/30 hover:border-yellow-400/60' },
  occupied: { dot: 'bg-red-400',      text: 'text-red-400',      card: 'border-red-400/30    hover:border-red-400/60'    },
}

function TableCard({ table, booking, status }: { table: Table; booking?: Booking; status: TableStatus }) {
  const t    = useT()
  const meta = STATUS_STYLE[status]
  const statusLabel = { free: t.free, reserved: t.reserved, occupied: t.occupied }[status]
  return (
    <div className={clsx(
      'bg-surface border rounded-2xl p-4 flex flex-col items-center gap-3 transition-all cursor-default',
      meta.card
    )}>
      <ShapeVisual shape={table.shape} status={status} capacity={table.capacity} />

      <div className="text-center">
        <p className="font-bold text-text text-sm">{table.name}</p>
        <p className="text-xs text-muted flex items-center justify-center gap-1 mt-0.5">
          <Users size={10} /> {table.capacity} os.
        </p>
      </div>

      <span className={clsx(
        'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-surface-2',
        meta.text
      )}>
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', meta.dot)} />
        {statusLabel}
      </span>

      {booking && (
        <div className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-center">
          <p className="text-xs font-semibold text-text truncate">{booking.guestName}</p>
          <p className="text-xs text-muted flex items-center justify-center gap-1 mt-0.5">
            <Clock size={9} /> {booking.time}
            <span className="mx-1">·</span>
            <Users size={9} /> {booking.guestCount}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col items-center gap-3 animate-pulse min-h-[160px] justify-center">
      <div className="w-14 h-14 rounded-full bg-surface-2" />
      <div className="w-16 h-3.5 bg-surface-2 rounded-md" />
      <div className="w-20 h-5 bg-surface-2 rounded-full" />
    </div>
  )
}

// ─── Add table modal ──────────────────────────────────────────────────────────

function AddTableModal({
  restaurantId, token, onClose, onCreated,
}: {
  restaurantId: string
  token:        string
  onClose:      () => void
  onCreated:    (t: Table) => void
}) {
  const t        = useT()
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
      const res  = await fetch(`${API}/api/restaurants/${restaurantId}/tables`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), capacity, shape }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Błąd'); return }
      onCreated(data)
      onClose()
    } catch {
      setError(t.serverError)
    } finally { setLoading(false) }
  }

  const SHAPES: { value: TableShape; label: string; cls: string }[] = [
    { value: 'round',     label: t.shapeRound,  cls: 'rounded-full w-8 h-8'  },
    { value: 'square',    label: t.shapeSquare, cls: 'rounded-lg w-8 h-8'    },
    { value: 'rectangle', label: t.shapeRect,   cls: 'rounded-lg w-12 h-7'   },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-text">{t.addTable}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t.tableName}</label>
            <input
              type="text" required value={name}
              onChange={e => setName(e.target.value)}
              placeholder="np. A1, Taras 2, Okno"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t.tableCapacity}</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCapacity(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-lg bg-surface-2 border border-border text-text hover:border-accent/50 transition-colors text-lg flex items-center justify-center">−</button>
              <span className="w-8 text-center text-lg font-bold text-text">{capacity}</span>
              <button type="button" onClick={() => setCapacity(c => Math.min(20, c + 1))}
                className="w-9 h-9 rounded-lg bg-surface-2 border border-border text-text hover:border-accent/50 transition-colors text-lg flex items-center justify-center">+</button>
              <div className="flex gap-1 ml-1 flex-wrap">
                {[2, 4, 6, 8, 10].map(n => (
                  <button key={n} type="button" onClick={() => setCapacity(n)}
                    className={clsx('w-7 h-7 rounded text-xs font-semibold transition-colors',
                      capacity === n ? 'bg-accent text-white' : 'bg-surface-2 border border-border text-muted hover:border-accent/50'
                    )}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shape */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t.tableShape}</label>
            <div className="grid grid-cols-3 gap-2">
              {SHAPES.map(s => (
                <button key={s.value} type="button" onClick={() => setShape(s.value)}
                  className={clsx(
                    'flex flex-col items-center gap-2 py-3 rounded-xl border transition-colors',
                    shape === s.value ? 'border-accent bg-accent/8' : 'border-border bg-surface-2 hover:border-muted/50'
                  )}
                >
                  <div className={clsx(
                    s.cls, 'border-2',
                    shape === s.value ? 'border-accent bg-accent/20' : 'border-muted/30 bg-muted/10'
                  )} />
                  <span className="text-xs text-muted">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted hover:text-text hover:border-muted/50 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {loading ? t.creating : t.addTable}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TablesPage() {
  const router        = useRouter()
  const t             = useT()

  const [token,     setToken]     = useState<string | null>(null)
  const [activeId,  setActiveId]  = useState<string | null>(null)
  const [tables,    setTables]    = useState<Table[]>([])
  const [bookings,  setBookings]  = useState<Booking[]>([])
  const [loading,   setLoading]   = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.push('/login'); return }
    setToken(tok)
    const stored = localStorage.getItem('stolik_active_restaurant')
    if (stored) { try { setActiveId(JSON.parse(stored)?.id) } catch {} }
  }, [router])

  const fetchData = useCallback(async (restaurantId: string) => {
    if (!token) return
    setLoading(true)
    try {
      const [tablesRes, bookingsRes] = await Promise.all([
        fetch(`${API}/api/restaurants/${restaurantId}/tables`,  { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/bookings/today/${restaurantId}`,      { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [td, bd] = await Promise.all([tablesRes.json(), bookingsRes.json()])
      setTables(Array.isArray(td) ? td : [])
      setBookings(Array.isArray(bd) ? bd : [])
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { if (activeId) fetchData(activeId) }, [activeId, fetchData])

  useEffect(() => {
    if (!activeId) return
    const id = setInterval(() => fetchData(activeId), 60_000)
    return () => clearInterval(id)
  }, [activeId, fetchData])

  if (!token) return null

  const activeTables = tables.filter(tb => tb.isActive)
  const counts = {
    free:     activeTables.filter(tb => getTableStatus(tb, bookings).status === 'free').length,
    reserved: activeTables.filter(tb => getTableStatus(tb, bookings).status === 'reserved').length,
    occupied: activeTables.filter(tb => getTableStatus(tb, bookings).status === 'occupied').length,
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-surface px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text">{t.floorPlan}</h1>
          <p className="text-sm text-muted mt-0.5">{t.tableCount(activeTables.length)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => activeId && fetchData(activeId)}
            disabled={loading}
            className="p-2 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {activeId && token && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={15} /> {t.addTable}
            </button>
          )}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-7 space-y-6">

        {/* Stats bar */}
        <div className="flex items-center gap-6 px-6 py-4 bg-surface border border-border rounded-xl">
          {([
            { key: 'free',     label: t.free,     dot: 'bg-accent'     },
            { key: 'reserved', label: t.reserved,  dot: 'bg-yellow-400' },
            { key: 'occupied', label: t.occupied,  dot: 'bg-red-400'    },
          ] as const).map(({ key, label, dot }) => (
            <div key={key} className="flex items-center gap-2.5">
              <span className={clsx('w-2.5 h-2.5 rounded-full shrink-0', dot)} />
              <span className="text-2xl font-bold text-text tabular-nums">{counts[key]}</span>
              <span className="text-sm text-muted">{label}</span>
            </div>
          ))}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
            <RefreshCw size={10} /> {t.refreshEvery}
          </span>
        </div>

        {/* Floor plan */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : activeTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted gap-4">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
              <Plus size={24} className="text-border" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-text">{t.noTables}</p>
              <p className="text-xs text-muted mt-1">{t.noTablesHint}</p>
            </div>
            {activeId && token && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Plus size={14} /> {t.addTable}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {activeTables.map(table => {
              const { status, booking } = getTableStatus(table, bookings)
              return <TableCard key={table.id} table={table} status={status} booking={booking} />
            })}

            {/* Add tile */}
            {activeId && token && (
              <button
                onClick={() => setShowModal(true)}
                className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-border hover:border-accent hover:text-accent transition-colors min-h-[160px]"
              >
                <Plus size={20} />
                <span className="text-xs font-medium">{t.addTable}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && activeId && token && (
        <AddTableModal
          restaurantId={activeId}
          token={token}
          onClose={() => setShowModal(false)}
          onCreated={tb => { setTables(prev => [...prev, tb]); setShowModal(false) }}
        />
      )}
    </div>
  )
}
