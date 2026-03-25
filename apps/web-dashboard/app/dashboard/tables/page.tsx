'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Users, RefreshCw, Clock,
  Pencil, Trash2, BookOpen, ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n'

const API              = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'
const SLOT_DURATION_MIN = 90

type TableShape  = 'round' | 'square' | 'rectangle'
type TableStatus = 'free' | 'reserved' | 'occupied'
type Location    = 'indoor' | 'outdoor' | 'terrace'

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
  bookingRef: string
  time:       string
  status:     string
  guestCount: number
  guestName:  string
  guestPhone: string
  tableId:    string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTableStatus(table: Table, bookings: Booking[]): { status: TableStatus; bookings: Booking[] } {
  const active = bookings.filter(
    b => b.tableId === table.id && ['confirmed', 'pending'].includes(b.status)
  )
  if (!active.length) return { status: 'free', bookings: [] }
  const now    = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const occupied = active.find(b => {
    const [h, m] = b.time.split(':').map(Number)
    return nowMin >= h * 60 + m && nowMin < h * 60 + m + SLOT_DURATION_MIN
  })
  return { status: occupied ? 'occupied' : 'reserved', bookings: active }
}

function autoPos(index: number, total: number): { x: number; y: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total * 1.6)))
  const col  = index % cols
  const row  = Math.floor(index / cols)
  const cellW = 80 / cols
  return {
    x: 10 + col * cellW + cellW / 2,
    y: 15 + row * 22,
  }
}

const STATUS_STYLE: Record<TableStatus, {
  dot: string; border: string; bg: string; glow: string; label: string
}> = {
  free:     { dot: 'bg-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/20', label: 'Free'     },
  reserved: { dot: 'bg-yellow-400',  border: 'border-yellow-400/50',  bg: 'bg-yellow-500/10',  glow: 'shadow-yellow-500/20',  label: 'Reserved' },
  occupied: { dot: 'bg-red-400',     border: 'border-red-400/50',     bg: 'bg-red-500/10',     glow: 'shadow-red-500/20',     label: 'Occupied' },
}

// ─── Table node on canvas ─────────────────────────────────────────────────────

function TableNode({
  table, status, selected,
  onMouseDown, onRightClick, onClick, onEdit, onDelete,
}: {
  table:       Table & { posX: number; posY: number }
  status:      TableStatus
  selected:    boolean
  onMouseDown: (e: React.MouseEvent) => void
  onRightClick:(e: React.MouseEvent) => void
  onClick:     (e: React.MouseEvent) => void
  onEdit:      () => void
  onDelete:    () => void
}) {
  const c = STATUS_STYLE[status]
  const [hovered, setHovered] = useState(false)

  const isRound = table.shape === 'round'
  const isRect  = table.shape === 'rectangle'
  const shape   = isRound ? 'rounded-full w-[76px] h-[76px]'
                : isRect  ? 'rounded-xl w-[92px] h-[62px]'
                :            'rounded-xl w-[76px] h-[76px]'

  return (
    <div
      className="absolute select-none"
      style={{
        left:      `${table.posX}%`,
        top:       `${table.posY}%`,
        transform: 'translate(-50%, -50%)',
        zIndex:    selected ? 20 : hovered ? 15 : 10,
        cursor:    'grab',
      }}
      onMouseDown={onMouseDown}
      onContextMenu={onRightClick}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover action bar */}
      {(hovered || selected) && (
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-1 z-30"
          onMouseDown={e => e.stopPropagation()}
          onMouseEnter={() => setHovered(true)}
        >
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="p-1.5 rounded-md bg-surface border border-border text-muted hover:text-accent hover:border-accent/40 transition-colors shadow-lg text-[10px] flex items-center gap-1"
            title="Edit"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-md bg-surface border border-border text-muted hover:text-red-400 hover:border-red-400/40 transition-colors shadow-lg"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* Table shape */}
      <div className={clsx(
        shape,
        'border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-100',
        c.bg, c.border,
        selected && 'ring-2 ring-accent/70 ring-offset-1 ring-offset-[rgb(var(--bg))]',
        (hovered || selected) && `shadow-xl ${c.glow}`,
      )}>
        <span className={clsx('w-2 h-2 rounded-full shrink-0', c.dot)} />
        <span className="text-[11px] font-bold text-text leading-tight text-center px-1.5 truncate max-w-full">
          {table.name}
        </span>
        <span className="text-[9px] text-muted flex items-center gap-0.5">
          <Users size={8} />{table.capacity}
        </span>
      </div>
    </div>
  )
}

// ─── Floor canvas ─────────────────────────────────────────────────────────────

function FloorCanvas({
  tables, bookings, selectedId, token,
  onSelectTable, onTableUpdated, onEditTable, onDeleteTable,
}: {
  tables:         Table[]
  bookings:       Booking[]
  selectedId:     string | null
  token:          string
  onSelectTable:  (t: Table | null) => void
  onTableUpdated: (t: Table) => void
  onEditTable:    (t: Table) => void
  onDeleteTable:  (t: Table) => void
}) {
  const canvasRef   = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<{
    tableId: string; startX: number; startY: number
    origX: number; origY: number; moved: boolean
  } | null>(null)
  const didDragRef  = useRef(false)

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [ctxMenu,   setCtxMenu]   = useState<{ tableId: string; x: number; y: number } | null>(null)

  // Init positions (server values + auto-layout for unpositioned tables)
  useEffect(() => {
    const map: Record<string, { x: number; y: number }> = {}
    const placed   = tables.filter(t => t.posX != null)
    const floating = tables.filter(t => t.posX == null)
    placed.forEach(t   => { map[t.id] = { x: t.posX!, y: t.posY! } })
    floating.forEach((t, i) => { map[t.id] = autoPos(placed.length + i, tables.length) })
    setPositions(map)
  }, [tables])

  function handleTableMouseDown(e: React.MouseEvent, table: Table) {
    e.preventDefault(); e.stopPropagation()
    const pos = positions[table.id] ?? { x: 50, y: 50 }
    draggingRef.current = {
      tableId: table.id, startX: e.clientX, startY: e.clientY,
      origX: pos.x, origY: pos.y, moved: false,
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const d = draggingRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    d.moved = true
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const nx = Math.max(5, Math.min(95, d.origX + (dx / rect.width)  * 100))
    const ny = Math.max(5, Math.min(95, d.origY + (dy / rect.height) * 100))
    setPositions(prev => ({ ...prev, [d.tableId]: { x: nx, y: ny } }))
  }

  async function handleMouseUp() {
    const d = draggingRef.current
    draggingRef.current = null
    if (!d || !d.moved) return
    didDragRef.current = true
    const pos = positions[d.tableId]
    if (!pos) return
    try {
      const res = await fetch(`${API}/api/tables/${d.tableId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ posX: pos.x, posY: pos.y }),
      })
      if (res.ok) onTableUpdated(await res.json())
    } catch {}
  }

  function handleTableClick(e: React.MouseEvent, table: Table) {
    e.stopPropagation()
    if (didDragRef.current) { didDragRef.current = false; return }
    onSelectTable(selectedId === table.id ? null : table)
  }

  function handleCanvasClick() {
    if (didDragRef.current) { didDragRef.current = false; return }
    setCtxMenu(null)
    onSelectTable(null)
  }

  function handleRightClick(e: React.MouseEvent, tableId: string) {
    e.preventDefault(); e.stopPropagation()
    setCtxMenu({ tableId, x: e.clientX, y: e.clientY })
  }

  const tablesWithPos: (Table & { posX: number; posY: number })[] = tables.map(t => ({
    ...t,
    posX: positions[t.id]?.x ?? (t.posX ?? 50),
    posY: positions[t.id]?.y ?? (t.posY ?? 50),
  }))

  return (
    <>
      <div
        ref={canvasRef}
        className="relative w-full bg-surface border border-border rounded-xl overflow-hidden select-none"
        style={{ height: 480 }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* Dot-grid background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgb(var(--border))" fillOpacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Corner labels */}
        <div className="absolute inset-0 pointer-events-none px-4 py-3 flex items-end justify-between">
          <span className="text-[10px] font-semibold text-muted/30 uppercase tracking-widest">Floor plan</span>
          <span className="text-[10px] text-muted/30">Drag to rearrange · Right-click for options</span>
        </div>

        {/* Empty state */}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-border/60 flex items-center justify-center">
              <Plus size={20} className="text-muted/40" />
            </div>
            <p className="text-sm text-muted">No tables yet — click "+ Add table" to get started</p>
          </div>
        )}

        {/* Table nodes */}
        {tablesWithPos.map(table => {
          const { status } = getTableStatus(table, bookings)
          return (
            <TableNode
              key={table.id}
              table={table}
              status={status}
              selected={selectedId === table.id}
              onMouseDown={e => handleTableMouseDown(e, table)}
              onRightClick={e => handleRightClick(e, table.id)}
              onClick={e => handleTableClick(e, table)}
              onEdit={() => { setCtxMenu(null); onEditTable(table) }}
              onDelete={() => { setCtxMenu(null); onDeleteTable(table) }}
            />
          )
        })}
      </div>

      {/* Context menu */}
      {ctxMenu && (() => {
        const target = tables.find(t => t.id === ctxMenu.tableId)
        if (!target) return null
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
            <div
              className="fixed z-50 bg-surface border border-border rounded-xl shadow-2xl py-1.5 min-w-[160px]"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
            >
              <button
                onClick={() => { setCtxMenu(null); onSelectTable(target) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-text hover:bg-surface-2 transition-colors"
              >
                <BookOpen size={13} className="text-muted" /> View bookings
              </button>
              <button
                onClick={() => { setCtxMenu(null); onEditTable(target) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-text hover:bg-surface-2 transition-colors"
              >
                <Pencil size={13} className="text-muted" /> Edit table
              </button>
              <div className="h-px bg-border mx-3 my-1" />
              <button
                onClick={() => { setCtxMenu(null); onDeleteTable(target) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </>
        )
      })()}
    </>
  )
}

// ─── Side panel ───────────────────────────────────────────────────────────────

const BOOKING_STATUS_CLS: Record<string, string> = {
  confirmed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  pending:   'text-yellow-400  bg-yellow-400/10  border-yellow-400/25',
  cancelled: 'text-red-400     bg-red-400/10     border-red-400/25',
  no_show:   'text-red-500     bg-red-500/10     border-red-500/25',
}

function TableSidePanel({ table, bookings, status, onClose }: {
  table:    Table
  bookings: Booking[]
  status:   TableStatus
  onClose:  () => void
}) {
  const c         = STATUS_STYLE[status]
  const tbBookings = bookings
    .filter(b => b.tableId === table.id)
    .sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="w-72 shrink-0 bg-surface border border-border rounded-xl flex flex-col overflow-hidden" style={{ maxHeight: 480 }}>
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border flex items-center gap-3">
        <span className={clsx('w-3 h-3 rounded-full shrink-0', c.dot)} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text text-sm">{table.name}</p>
          <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
            <Users size={10} /> {table.capacity} seats
            <span className="opacity-40">·</span>
            {table.shape}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Status badge */}
      <div className="px-4 pt-3 pb-1">
        <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border', c.bg, c.border, c.dot.replace('bg-', 'text-'))}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', c.dot)} />
          {c.label}
        </span>
      </div>

      {/* Bookings list */}
      <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
        Today's bookings
      </p>
      <div className="flex-1 overflow-y-auto">
        {tbBookings.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-3xl mb-2">🗓️</p>
            <p className="text-xs text-muted">No bookings assigned to this table today</p>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-2">
            {tbBookings.map(b => (
              <div key={b.id} className="bg-surface-2 border border-border rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-text text-sm">{b.time}</span>
                  <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full border', BOOKING_STATUS_CLS[b.status] ?? 'text-muted bg-surface border-border')}>
                    {b.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-text truncate">{b.guestName}</p>
                <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                  <Users size={10} /> {b.guestCount}
                  <span className="opacity-40">·</span>
                  {b.guestPhone}
                </p>
                <p className="text-[10px] text-muted/50 font-mono mt-1">{b.bookingRef}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add / Edit table modal ───────────────────────────────────────────────────

function TableModal({
  restaurantId, token, onClose, tableCount,
  onCreated, onUpdated, existing,
}: {
  restaurantId: string
  token:        string
  onClose:      () => void
  tableCount:   number
  onCreated?:   (t: Table) => void
  onUpdated?:   (t: Table) => void
  existing?:    Table
}) {
  const t      = useT()
  const isEdit = !!existing

  const [name,     setName]     = useState(existing?.name     ?? `Table ${tableCount + 1}`)
  const [capacity, setCapacity] = useState(existing?.capacity ?? 4)
  const [shape,    setShape]    = useState<TableShape>(existing?.shape ?? 'round')
  const [location, setLocation] = useState<Location>('indoor')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Place new tables in a sensible zone based on location
      const zoneX = { indoor: 30, outdoor: 70, terrace: 80 }[location]
      const initPos = !isEdit ? { posX: zoneX + (Math.random() - 0.5) * 20, posY: 20 + Math.random() * 55 } : {}

      const url    = isEdit ? `${API}/api/tables/${existing!.id}` : `${API}/api/restaurants/${restaurantId}/tables`
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), capacity, shape, ...initPos }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      isEdit ? onUpdated?.(data) : onCreated?.(data)
      onClose()
    } catch {
      setError(t.serverError)
    } finally { setLoading(false) }
  }

  const SHAPES: { value: TableShape; label: string; cls: string }[] = [
    { value: 'round',     label: 'Round',     cls: 'rounded-full w-9 h-9'    },
    { value: 'square',    label: 'Square',    cls: 'rounded-lg w-9 h-9'      },
    { value: 'rectangle', label: 'Rectangle', cls: 'rounded-lg w-[52px] h-7' },
  ]

  const LOCATIONS: { value: Location; emoji: string; label: string }[] = [
    { value: 'indoor',  emoji: '🏠', label: 'Indoor'  },
    { value: 'outdoor', emoji: '🌳', label: 'Outdoor' },
    { value: 'terrace', emoji: '🌿', label: 'Terrace' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-text">{isEdit ? 'Edit table' : t.addTable}</h2>
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
              placeholder="e.g. T1, Window, Terrace 3"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t.tableCapacity}</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCapacity(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-lg bg-surface-2 border border-border text-text hover:border-accent/50 transition-colors flex items-center justify-center text-lg">
                −
              </button>
              <span className="w-8 text-center text-lg font-bold text-text">{capacity}</span>
              <button type="button" onClick={() => setCapacity(c => Math.min(20, c + 1))}
                className="w-9 h-9 rounded-lg bg-surface-2 border border-border text-text hover:border-accent/50 transition-colors flex items-center justify-center text-lg">
                +
              </button>
              <div className="flex gap-1 ml-1">
                {[2, 4, 6, 8].map(n => (
                  <button key={n} type="button" onClick={() => setCapacity(n)}
                    className={clsx('w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                      capacity === n
                        ? 'bg-accent text-white'
                        : 'bg-surface-2 border border-border text-muted hover:border-accent/50'
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
                    'flex flex-col items-center gap-2.5 py-3 rounded-xl border transition-colors',
                    shape === s.value ? 'border-accent bg-accent/8' : 'border-border bg-surface-2 hover:border-muted/50'
                  )}
                >
                  <div className={clsx(s.cls, 'border-2',
                    shape === s.value ? 'border-accent bg-accent/20' : 'border-muted/30 bg-muted/10'
                  )} />
                  <span className="text-xs text-muted">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location — only for new tables */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Location</label>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map(l => (
                  <button key={l.value} type="button" onClick={() => setLocation(l.value)}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs transition-colors',
                      location === l.value
                        ? 'border-accent bg-accent/8 text-accent'
                        : 'border-border bg-surface-2 text-muted hover:border-muted/50'
                    )}
                  >
                    <span className="text-lg">{l.emoji}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted hover:text-text hover:border-muted/50 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {loading ? (isEdit ? t.saving : t.creating) : (isEdit ? 'Save changes' : t.addTable)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TablesPage() {
  const router = useRouter()
  const t      = useT()

  const [token,         setToken]         = useState<string | null>(null)
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [tables,        setTables]        = useState<Table[]>([])
  const [bookings,      setBookings]      = useState<Booking[]>([])
  const [loading,       setLoading]       = useState(false)
  const [showAdd,       setShowAdd]       = useState(false)
  const [editingTable,  setEditingTable]  = useState<Table | null>(null)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)

  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.push('/login'); return }
    setToken(tok)
    try { setActiveId(JSON.parse(localStorage.getItem('stolik_active_restaurant') ?? 'null')?.id ?? null) } catch {}
  }, [router])

  const fetchData = useCallback(async (restaurantId: string) => {
    if (!token) return
    setLoading(true)
    try {
      const [tr, br] = await Promise.all([
        fetch(`${API}/api/restaurants/${restaurantId}/tables`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/bookings/today/${restaurantId}`,     { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [td, bd] = await Promise.all([tr.json(), br.json()])
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

  async function handleDeleteTable(table: Table) {
    if (!token || !confirm(`Delete "${table.name}"?`)) return
    try {
      await fetch(`${API}/api/tables/${table.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      setTables(prev => prev.filter(tb => tb.id !== table.id))
      if (selectedTable?.id === table.id) setSelectedTable(null)
    } catch {}
  }

  if (!token) return null

  const activeTables = tables.filter(tb => tb.isActive)
  const counts = {
    free:     activeTables.filter(tb => getTableStatus(tb, bookings).status === 'free').length,
    reserved: activeTables.filter(tb => getTableStatus(tb, bookings).status === 'reserved').length,
    occupied: activeTables.filter(tb => getTableStatus(tb, bookings).status === 'occupied').length,
  }
  const selectedStatus = selectedTable ? getTableStatus(selectedTable, bookings) : null

  return (
    <div className="flex flex-col min-h-full">

      {/* Header */}
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
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={15} /> {t.addTable}
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-6 space-y-5">

        {/* Status legend */}
        <div className="flex items-center gap-6 px-6 py-4 bg-surface border border-border rounded-xl">
          {([
            { key: 'free',     label: t.free,    dot: 'bg-emerald-400' },
            { key: 'reserved', label: t.reserved, dot: 'bg-yellow-400'  },
            { key: 'occupied', label: t.occupied, dot: 'bg-red-400'     },
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

        {/* Canvas + side panel row */}
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="w-full bg-surface border border-border rounded-xl flex items-center justify-center" style={{ height: 480 }}>
                <RefreshCw size={20} className="animate-spin text-muted" />
              </div>
            ) : (
              <FloorCanvas
                tables={activeTables}
                bookings={bookings}
                selectedId={selectedTable?.id ?? null}
                token={token}
                onSelectTable={setSelectedTable}
                onTableUpdated={updated => setTables(prev => prev.map(tb => tb.id === updated.id ? updated : tb))}
                onEditTable={setEditingTable}
                onDeleteTable={handleDeleteTable}
              />
            )}
          </div>

          {selectedTable && selectedStatus && (
            <TableSidePanel
              table={selectedTable}
              bookings={bookings}
              status={selectedStatus.status}
              onClose={() => setSelectedTable(null)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdd && activeId && token && (
        <TableModal
          restaurantId={activeId}
          token={token}
          tableCount={activeTables.length}
          onClose={() => setShowAdd(false)}
          onCreated={tb => { setTables(prev => [...prev, tb]); setShowAdd(false) }}
        />
      )}
      {editingTable && token && activeId && (
        <TableModal
          restaurantId={activeId}
          token={token}
          tableCount={activeTables.length}
          existing={editingTable}
          onClose={() => setEditingTable(null)}
          onUpdated={updated => {
            setTables(prev => prev.map(tb => tb.id === updated.id ? updated : tb))
            if (selectedTable?.id === updated.id) setSelectedTable(updated)
            setEditingTable(null)
          }}
        />
      )}
    </div>
  )
}
